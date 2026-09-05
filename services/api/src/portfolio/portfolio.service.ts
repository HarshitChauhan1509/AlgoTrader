import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { Order } from '@stock-platform/types';

@Injectable()
export class PortfolioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PortfolioService.name);
  private subscriberClient: any;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Portfolio Engine...');
    this.subscriberClient = this.redisService.getClient().duplicate();
    await this.subscriberClient.subscribe('execution:orders');

    this.subscriberClient.on('message', async (channel: string, message: string) => {
      if (channel === 'execution:orders') {
        try {
          const order: Order = JSON.parse(message);
          if (order.status === 'EXECUTED') {
            await this.handleExecutedOrder(order);
          }
        } catch (e) {
          this.logger.error(`Failed to process order for portfolio update`, e);
        }
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Portfolio Engine...');
  }

  private async handleExecutedOrder(order: Order) {
    try {
      // 1. Resolve Portfolio
      let portfolioId = order.portfolioId;
      if (!portfolioId) {
        // Fallback: Find or create a default PAPER portfolio
        const defaultPortfolio = await this.getDefaultPortfolio();
        portfolioId = defaultPortfolio.id;
      }

      // 2. Calculate impact
      const tradeValue = order.quantity * (order.price || 0);
      const balanceChange = order.action === 'BUY' ? -tradeValue : tradeValue;
      const quantityChange = order.action === 'BUY' ? order.quantity : -order.quantity;

      // 3. Execute DB Transaction
      await this.prisma.$transaction(async (tx: any) => {
        // Update Portfolio Balance
        const portfolio = await tx.portfolio.update({
          where: { id: portfolioId },
          data: {
            currentBalance: {
              increment: balanceChange,
            },
          },
        });

        // Find existing position
        const existingPosition = await tx.position.findUnique({
          where: {
            portfolioId_exchange_symbol: {
              portfolioId: portfolioId as string,
              exchange: 'NSE', // Defaulting for now
              symbol: order.symbol,
            },
          },
        });

        if (existingPosition) {
          const newQuantity = existingPosition.quantity + quantityChange;
          
          if (newQuantity === 0) {
            // Close position
            await tx.position.delete({
              where: { id: existingPosition.id },
            });
            this.logger.log(`Closed position for ${order.symbol}`);
          } else {
            // Update position (simplified average price logic)
            // In a real system, average price calculation is more complex
            await tx.position.update({
              where: { id: existingPosition.id },
              data: {
                quantity: newQuantity,
                // Only update average price on BUY. On SELL, avg price stays the same.
                averagePrice: order.action === 'BUY' 
                  ? ((existingPosition.averagePrice * existingPosition.quantity) + tradeValue) / newQuantity
                  : existingPosition.averagePrice
              },
            });
            this.logger.log(`Updated position for ${order.symbol}. New Qty: ${newQuantity}`);
          }
        } else if (order.action === 'BUY') {
          // Create new position
          await tx.position.create({
            data: {
              portfolioId: portfolioId as string,
              exchange: 'NSE',
              symbol: order.symbol,
              quantity: order.quantity,
              averagePrice: order.price || 0,
            },
          });
          this.logger.log(`Opened new position for ${order.symbol}`);
        } else {
          this.logger.warn(`Attempted to SELL ${order.symbol} without an existing position!`);
        }

        // Optional: We can also insert the Order into the DB here if it hasn't been saved yet.
      });

    } catch (e) {
      this.logger.error(`Failed to update portfolio for order ${order.id}`, e);
    }
  }

  private async getDefaultPortfolio() {
    let portfolio = await this.prisma.portfolio.findFirst({
      where: { type: 'PAPER' }
    });

    if (!portfolio) {
      // Find a user or create a dummy user to attach to
      let user = await this.prisma.user.findFirst();
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: 'system@algotrader.local',
            passwordHash: 'dummy',
            firstName: 'System',
            lastName: 'User'
          }
        });
      }

      portfolio = await this.prisma.portfolio.create({
        data: {
          userId: user.id,
          name: 'Default Paper Trading',
          type: 'PAPER',
          startBalance: 100000,
          currentBalance: 100000,
        }
      });
      this.logger.log(`Created default paper trading portfolio: ${portfolio.id}`);
    }

    return portfolio;
  }
}

