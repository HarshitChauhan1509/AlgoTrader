import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Signal, Timeframe } from '@stock-platform/types';

@Controller('execution')
export class ExecutionController {
  private readonly logger = new Logger(ExecutionController.name);

  constructor(private readonly executionService: ExecutionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('manual-order')
  async placeManualOrder(@Req() req: any, @Body() body: any) {
    this.logger.log(`Manual order request from ${req.user.userId}`);
    
    // We treat manual orders as a synthetic "Signal" without a strategyId, 
    // or with a special 'MANUAL' strategyId.
    const signal: Signal = {
      userId: req.user.userId,
      symbol: body.symbol,
      timeframe: '1m' as Timeframe, // Ignored for manual
      timestamp: new Date(),
      strategyId: 'MANUAL', 
      action: body.action,
      price: body.price || 0,
    };

    // The ExecutionService.handleSignal will execute the trade
    // We would need to expose it publicly or bypass the event bus.
    // Let's emit it to Redis so it goes through the standard pipeline!
    await this.executionService.publishManualSignal(signal);
    return { status: 'PENDING', message: 'Manual order sent' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('close-position')
  async closePosition(@Req() req: any, @Body() body: { symbol: string, quantity: number, action: 'BUY' | 'SELL' }) {
    const signal: Signal = {
      userId: req.user.userId,
      symbol: body.symbol,
      timeframe: '1m' as Timeframe,
      timestamp: new Date(),
      strategyId: 'MANUAL_CLOSE', 
      action: body.action,
      price: 0, // Market order
    };

    await this.executionService.publishManualSignal(signal);
    return { status: 'PENDING', message: 'Position close order sent' };
  }

  @Post('webhooks/alpaca')
  @HttpCode(HttpStatus.OK)
  async handleAlpacaWebhook(
    @Headers('authorization') authHeader: string,
    @Body() payload: any
  ) {
    this.logger.log(`Received Alpaca webhook event: ${payload?.event}`);

    // In production, we'd verify the HMAC signature or Basic Auth provided by Alpaca
    if (payload && payload.event === 'trade_updates') {
      const eventData = payload.data;
      if (!eventData || !eventData.order) return { received: true };

      const brokerOrderId = eventData.order.id;
      const status = eventData.event; // 'fill', 'partial_fill', 'rejected', 'canceled', etc.
      
      const price = eventData.price || eventData.order.filled_avg_price;
      const qty = eventData.order.filled_qty;

      await this.executionService.processBrokerWebhook(brokerOrderId, status, price, qty);
    }

    return { received: true };
  }
}
