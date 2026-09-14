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
        const defaultPortfolio = await this.prisma.portfolio.findFirst({ where: { type: 'PAPER' } }); // Fallback for systemic headless orders without portfolioId
        if (defaultPortfolio) { portfolioId = defaultPortfolio.id; } else { this.logger.error('No default portfolio found'); return; }
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
                  : existingPosition.averagePrice,
                stopLossPrice: order.stopLossPrice ?? existingPosition.stopLossPrice,
                takeProfitPrice: order.takeProfitPrice ?? existingPosition.takeProfitPrice,
                trailingDistance: order.trailingDistance ?? existingPosition.trailingDistance,
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
              stopLossPrice: order.stopLossPrice,
              takeProfitPrice: order.takeProfitPrice,
              trailingDistance: order.trailingDistance,
              highestPriceReached: order.price || 0,
            },
          });
          this.logger.log(`Opened new position for ${order.symbol}`);
        } else {
          this.logger.warn(`Attempted to SELL ${order.symbol} without an existing position!`);
        }

        
        let realizedPnL = null;
        if (existingPosition && order.action === 'SELL') {
          // Calculate PnL for the quantity being sold
          realizedPnL = (Number(order.price) - Number(existingPosition.averagePrice)) * order.quantity;
        } else if (existingPosition && order.action === 'BUY' && existingPosition.quantity < 0) {
          // Short covering
          realizedPnL = (Number(existingPosition.averagePrice) - Number(order.price)) * order.quantity;
        }

        await tx.trade.create({
          data: {
            userId: portfolio.userId,
            portfolioId: portfolioId as string,
            orderId: null, // Since we aren't perfectly syncing Orders table yet
            symbol: order.symbol,
            side: order.action,
            quantity: order.quantity,
            price: order.price || 0,
            realizedPnL: realizedPnL,
            tradedAt: order.timestamp || new Date(),
          }
        });
  
      });

    } catch (e) {
      this.logger.error(`Failed to update portfolio for order ${order.id}`, e);
    }
  }

    public async getPortfolioMetrics(userId: string) {
    const portfolio = await this.getOrCreatePortfolioForUser(userId);
    const trades = await this.prisma.trade.findMany({
      where: { portfolioId: portfolio.id, realizedPnL: { not: null } }
    });

    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    for (const t of trades) {
      const pnl = Number(t.realizedPnL);
      totalPnL += pnl;
      if (pnl > 0) {
        winningTrades++;
        if (pnl > bestTrade) bestTrade = pnl;
      } else if (pnl < 0) {
        losingTrades++;
        if (pnl < worstTrade) worstTrade = pnl;
      }
    }

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalPnL,
      totalTrades,
      winRate: Number(winRate.toFixed(2)),
      winningTrades,
      losingTrades,
      bestTrade,
      worstTrade
    };
  }

  public async getPortfolioWithPositions(userId: string) {
    const portfolio = await this.getOrCreatePortfolioForUser(userId);
    return this.prisma.portfolio.findUnique({
      where: { id: portfolio.id },
      include: { positions: true, orders: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });
  }

  private async getOrCreatePortfolioForUser(userId: string) {
    let portfolio = await this.prisma.portfolio.findFirst({ where: { userId, type: 'PAPER' } });

    if (!portfolio) {
      // Find a user or create a dummy user to attach to
      let user = await this.prisma.user.findFirst();
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: 'system@algotrader.local',
            passwordHash: 'dummy',
            name: 'System User'
          }
        });
      }

      portfolio = await this.prisma.portfolio.create({
        data: {
          userId: user.id,
          name: 'Default Paper Trading',
          type: 'PAPER',
          initialBalance: 100000,
          currentBalance: 100000,
        }
      });
      this.logger.log(`Created default paper trading portfolio: ${portfolio.id}`);
    }

    return portfolio;
  }
}









