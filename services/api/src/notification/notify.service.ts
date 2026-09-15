import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Notification Engine...');
    
    const client = this.redisService.getClient();
    const subClient = client.duplicate();
    
    await subClient.subscribe('execution:orders', 'strategy:signals');

    subClient.on('message', async (channel, message) => {
      try {
        if (channel === 'execution:orders') {
          await this.handleOrderUpdate(JSON.parse(message));
        } else if (channel === 'strategy:signals') {
          await this.handleStrategySignal(JSON.parse(message));
        }
      } catch (e) {
        this.logger.error(`Failed to process notification message from ${channel}`, e);
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Notification Engine...');
  }

  private async handleOrderUpdate(order: any) {
    if (!order.userId) return;

    let title = '';
    let body = '';

    if (order.status === 'EXECUTED') {
      title = 'Order Executed';
      body = `Your ${order.action} order for ${order.symbol} has been executed at ₹${order.price}.`;
    } else if (order.status === 'REJECTED') {
      title = 'Order Rejected';
      body = `Your ${order.action} order for ${order.symbol} was rejected.`;
    } else {
      return;
    }

    await this.createAndBroadcastNotification(order.userId, title, body, { orderId: order.id, type: 'ORDER_UPDATE' });
  }

  private async handleStrategySignal(signal: any) {
    if (!signal.userId) return;

    const title = 'Trading Signal Triggered';
    const body = `${signal.action} ${signal.symbol} triggered by strategy ${signal.strategyId}.`;

    await this.createAndBroadcastNotification(signal.userId, title, body, { signalId: signal.id, type: 'STRATEGY_SIGNAL' });
  }

  private async createAndBroadcastNotification(userId: string, title: string, body: string, payload: any = {}) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title,
          body,
          payload,
          status: 'UNREAD',
        },
      });

      this.logger.log(`Created Notification: ${title} for User ${userId}`);
      
      await this.redisService.publish('notifications:broadcast', JSON.stringify(notification));
    } catch (e) {
      this.logger.error('Failed to create notification', e);
    }
  }
}
