import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { BrokerAdapterFactory } from './broker/broker-adapter.factory';
import { RiskService } from '../risk/risk.service';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus, OrderType, Signal } from '@stock-platform/types';
import * as crypto from 'crypto';

@Injectable()
export class ExecutionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionService.name);
  
  // Track orders in memory for the stub
  private readonly orders = new Map<string, Order>();

  constructor(
    private readonly redisService: RedisService,
    private readonly riskService: RiskService,
    private readonly prisma: PrismaService,
    private readonly brokerFactory: BrokerAdapterFactory
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Execution Engine...');

    const client = this.redisService.getClient();
    const subClient = client.duplicate();

    // Subscribe to strategy signals and market data for SL/TP evaluation
    await subClient.subscribe('strategy:signals');
    await subClient.psubscribe('market-data:candles:*:*');

    subClient.on('message', async (channel, message) => {
      if (channel === 'strategy:signals') {
        try {
          const signal: Signal = JSON.parse(message);
          signal.timestamp = new Date(signal.timestamp);
          await this.handleSignal(signal);
        } catch (e) {
          this.logger.error('Failed to parse incoming signal', e);
        }
      }
    });

    subClient.on('pmessage', async (pattern, channel, message) => {
      if (pattern === 'market-data:candles:*:*') {
        try {
          const candle = JSON.parse(message);
          await this.monitorActivePositions(candle);
        } catch (e) {
          this.logger.error('Failed to monitor positions against candle', e);
        }
      }
    });

    this.logger.log('Subscribed to strategy signals and market data (for SL/TP).');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Execution Engine...');
  }

  /**
   * Processes a new trading signal, formats a broker order, and simulates execution.
   */
  
  public async publishManualSignal(signal: Signal) {
    this.logger.log(`Publishing manual signal for ${signal.symbol}`);
    await this.redisService.publish('strategy:signals', JSON.stringify(signal));
  }

  private async handleSignal(signal: Signal) {
    this.logger.log(`Received signal to ${signal.action} ${signal.symbol} at ${signal.price}`);

    // Create an Order object (Hardcoding quantity to 1 for this phase)
    const order: Order = {
      id: crypto.randomUUID(),
      userId: signal.userId,
      strategyId: signal.strategyId,
      symbol: signal.symbol,
      action: signal.action,
      type: 'MARKET', // Defaulting to market orders for simple signals
      quantity: 1, 
      price: signal.price,
      stopLossPrice: signal.stopLossPrice,
      takeProfitPrice: signal.takeProfitPrice,
      trailingDistance: signal.trailingDistance,
      status: 'PENDING',
      timestamp: new Date(),
    } as any;

    const riskAssessment = await this.riskService.evaluateOrder(order);

    if (!riskAssessment.approved) {
      order.status = 'REJECTED';
      this.logger.warn(`Order ${order.id} REJECTED: ${riskAssessment.reason}`);
      this.orders.set(order.id, order);
      await this.publishOrderUpdate(order);
      return;
    }

    this.orders.set(order.id, order);
    await this.publishOrderUpdate(order);

    // Send to Broker Adapter
    try {
      const adapter = await this.brokerFactory.getAdapterForUser(order.userId, 'alpaca');
      const brokerResponse = await adapter.placeOrder(order);
      order.brokerOrderId = brokerResponse.brokerOrderId;
      order.status = brokerResponse.status;
      order.price = (brokerResponse as any).averagePrice || order.price;
      this.logger.log(`Order ${order.id} ${order.status} by broker. Avg Price: ${order.price}`);
    } catch (e: any) {
      this.logger.error(`Broker rejected order ${order.id}: ${e.message}`);
      order.status = 'FAILED';
    }

    await this.publishOrderUpdate(order);
  }

  /**
   * Processes async webhooks from brokers (like Alpaca 'trade_updates')
   */
  public async processBrokerWebhook(brokerOrderId: string, eventType: string, price: number, qty: number) {
    this.logger.log(`Processing Webhook for Broker Order ID: ${brokerOrderId}, Event: ${eventType}`);
    
    // Find internal order
    let internalOrder: Order | undefined;
    for (const [id, order] of this.orders.entries()) {
      if (order.brokerOrderId === brokerOrderId) {
        internalOrder = order;
        break;
      }
    }

    if (!internalOrder) {
      this.logger.warn(`Received webhook for unknown broker order: ${brokerOrderId}`);
      return;
    }

    // Map Alpaca event to internal status
    if (eventType === 'fill' || eventType === 'partial_fill') {
      internalOrder.status = 'EXECUTED';
      internalOrder.price = price || internalOrder.price || 0;
      
      this.logger.log(`Webhook Confirmation: Order ${internalOrder.id} FILLED at ${internalOrder.price}`);
      await this.publishOrderUpdate(internalOrder);
    } else if (eventType === 'rejected' || eventType === 'canceled') {
      internalOrder.status = 'REJECTED';
      this.logger.warn(`Webhook Update: Order ${internalOrder.id} REJECTED/CANCELED`);
      await this.publishOrderUpdate(internalOrder);
    }
  }

  /**
   * Evaluates active positions for Stop Loss, Take Profit, and Trailing Stops.
   */
  private async monitorActivePositions(candle: any) {
    const symbol = candle.symbol;
    const currentPrice = candle.close; // Evaluate against close price of the tick/candle

    // Fetch positions that have SL/TP parameters for this symbol
    const positions = await this.prisma.position.findMany({
      where: {
        symbol: symbol,
        OR: [
          { stopLossPrice: { not: null } },
          { takeProfitPrice: { not: null } },
          { trailingDistance: { not: null } },
        ]
      }
    });

    for (const position of positions) {
      let triggerSell = false;
      let reason = '';

      // 1. Update Trailing Stop Loss if applicable
      if (position.trailingDistance) {
        const trailingDist = Number(position.trailingDistance);
        const highestPrice = Number(position.highestPriceReached || position.averagePrice);
        
        if (currentPrice > highestPrice) {
          await this.prisma.position.update({
            where: { id: position.id },
            data: { highestPriceReached: currentPrice }
          });
          // Also update our local variable so evaluation below is correct
          (position as any).highestPriceReached = currentPrice;
        }

        // TSL triggers if current price falls below (highest - trailingDist)
        const currentHighest = Number((position as any).highestPriceReached);
        if (currentPrice <= (currentHighest - trailingDist)) {
          triggerSell = true;
          reason = `Trailing Stop Hit (Highest: ${currentHighest}, Dist: ${trailingDist})`;
        }
      }

      // 2. Check Static Stop Loss
      if (!triggerSell && position.stopLossPrice) {
        if (currentPrice <= Number(position.stopLossPrice)) {
          triggerSell = true;
          reason = `Stop Loss Hit (${position.stopLossPrice})`;
        }
      }

      // 3. Check Take Profit
      if (!triggerSell && position.takeProfitPrice) {
        if (currentPrice >= Number(position.takeProfitPrice)) {
          triggerSell = true;
          reason = `Take Profit Hit (${position.takeProfitPrice})`;
        }
      }

      // If triggered, execute a MARKET SELL order
      if (triggerSell) {
        this.logger.warn(`SL/TP TRIGGERED for position ${position.id}: ${reason}`);
        
        const order: Order = {
          id: crypto.randomUUID(),
          userId: position.userId,
          portfolioId: position.portfolioId,
          symbol: position.symbol,
          action: 'SELL',
          type: 'MARKET',
          quantity: position.quantity,
          price: currentPrice,
          status: 'PENDING',
          timestamp: new Date(),
        } as any;

        // Execute directly for the stub implementation
        order.status = 'EXECUTED';
        this.orders.set(order.id, order);

        // Notify system of executed stop loss
        setTimeout(async () => {
          this.logger.log(`Bracket Order Executed: ${order.action} ${order.symbol} @ ${order.price}`);
          await this.publishOrderUpdate(order);
        }, 100);
      }
    }
  }

  private async publishOrderUpdate(order: Order) {
    await this.redisService.publish('execution:orders', JSON.stringify(order));
  }
}


