import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { BrokerAdapter, BROKER_ADAPTER_TOKEN } from './broker/broker.adapter';
import { RiskService } from '../risk/risk.service';
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
    @Inject(BROKER_ADAPTER_TOKEN) private readonly brokerAdapter: BrokerAdapter
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Execution Engine...');

    const client = this.redisService.getClient();
    const subClient = client.duplicate();

    // Subscribe to strategy signals
    await subClient.subscribe('strategy:signals');

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

    this.logger.log('Subscribed to strategy signals.');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Execution Engine...');
  }

  /**
   * Processes a new trading signal, formats a broker order, and simulates execution.
   */
  private async handleSignal(signal: Signal) {
    this.logger.log(`Received signal to ${signal.action} ${signal.symbol} at ${signal.price}`);

    // Create an Order object (Hardcoding quantity to 1 for this phase)
    const order: Order = {
      id: crypto.randomUUID(),
      strategyId: signal.strategyId,
      symbol: signal.symbol,
      action: signal.action,
      type: 'MARKET', // Defaulting to market orders for simple signals
      quantity: 1, 
      price: signal.price,
      status: 'PENDING',
      timestamp: new Date(),
    };

    const riskAssessment = this.riskService.evaluateOrder(order);

    if (!riskAssessment.approved) {
      order.status = 'REJECTED';
      this.logger.warn(`Order ${order.id} REJECTED: ${riskAssessment.reason}`);
      this.orders.set(order.id, order);
      await this.publishOrderUpdate(order);
      return;
    }

        this.orders.set(order.id, order);
    await this.publishOrderUpdate(order);

    // Handoff to Broker Adapter
    await this.executeOrder(order);
  }

  /**
   * Simulates the broker's response confirming the trade execution.
   */
  private async executeOrder(order: Order) {
    try {
      const response = await this.brokerAdapter.placeOrder(order);
      
      if (response.status === 'COMPLETE') {
        order.status = 'EXECUTED';
      } else {
        order.status = 'FAILED';
      }
      
      this.logger.log(`Order ${order.id} for ${order.symbol} ${order.status}`);
      
      this.orders.set(order.id, order);
      await this.publishOrderUpdate(order);
    } catch (e) {
      this.logger.error(`Failed to execute order ${order.id}`, e);
      order.status = 'FAILED';
      this.orders.set(order.id, order);
      await this.publishOrderUpdate(order);
    }
  }

  /**
   * Broadcasts the order state back to Redis so the Risk/Portfolio engines can read it.
   */
  private async publishOrderUpdate(order: Order) {
    try {
      await this.redisService.publish('execution:orders', JSON.stringify(order));
    } catch (e) {
      this.logger.error(`Failed to publish order update for ${order.id}`, e);
    }
  }

  // Helper method for potential unit testing
  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }
}




