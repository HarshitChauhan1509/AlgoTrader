import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ExecutionService } from './execution.service';

@Controller('execution')
export class ExecutionController {
  private readonly logger = new Logger(ExecutionController.name);

  constructor(private readonly executionService: ExecutionService) {}

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
