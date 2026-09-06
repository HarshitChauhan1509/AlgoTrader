import { Injectable, Logger } from '@nestjs/common';
import { Order } from '@stock-platform/types';
import { PrismaService } from '../prisma/prisma.service';

export interface RiskEvaluationResult {
  approved: boolean;
  reason?: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // Configuration for risk limits
  private readonly MAX_ORDER_VALUE = 100000; // 1 Lakh INR
  private readonly BLACKLISTED_SYMBOLS = ['GME', 'AMC', 'DOGE'];

  private dailyOrdersCount = 0;
  private readonly MAX_DAILY_ORDERS = 100;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates a proposed order against all risk rules before execution.
   */
  public async evaluateOrder(order: Order): Promise<RiskEvaluationResult> {
    this.logger.log(`Evaluating risk for proposed order: ${order.action} ${order.quantity} ${order.symbol}`);

    // Rule 1: Check Blacklist
    if (this.BLACKLISTED_SYMBOLS.includes(order.symbol)) {
      const reason = `Symbol ${order.symbol} is blacklisted by risk parameters.`;
      this.logger.warn(reason);
      return { approved: false, reason };
    }

    // Rule 2: Max Order Value
    const orderValue = (order.price || 0) * order.quantity;
    if (orderValue > this.MAX_ORDER_VALUE) {
      const reason = `Order value ${orderValue} exceeds maximum allowed (${this.MAX_ORDER_VALUE}).`;
      this.logger.warn(reason);
      return { approved: false, reason };
    }

    // Rule 3: Max Daily Orders
    if (this.dailyOrdersCount >= this.MAX_DAILY_ORDERS) {
      const reason = `Exceeded maximum daily order limit (${this.MAX_DAILY_ORDERS}).`;
      this.logger.warn(reason);
      return { approved: false, reason };
    }

    // Attempt to resolve portfolio for real database checks
    if (order.portfolioId) {
      const portfolio = await this.prisma.portfolio.findUnique({
        where: { id: order.portfolioId }
      });

      if (!portfolio) {
        return { approved: false, reason: `Portfolio ${order.portfolioId} not found.` };
      }

      // Rule 4: Sufficient Cash Balance for BUY
      if (order.action === 'BUY') {
        if (portfolio.currentBalance < orderValue) {
          const reason = `Insufficient funds. Required: ${orderValue}, Available: ${portfolio.currentBalance}`;
          this.logger.warn(reason);
          return { approved: false, reason };
        }
      }

      // Rule 5: Sufficient Position Quantity for SELL (No naked shorts)
      if (order.action === 'SELL') {
        const position = await this.prisma.position.findUnique({
          where: {
            portfolioId_exchange_symbol: {
              portfolioId: order.portfolioId,
              exchange: 'NSE', // Hardcoded for this phase
              symbol: order.symbol,
            }
          }
        });

        if (!position || position.quantity < order.quantity) {
          const available = position ? position.quantity : 0;
          const reason = `Insufficient holdings for ${order.symbol}. Required: ${order.quantity}, Available: ${available}`;
          this.logger.warn(reason);
          return { approved: false, reason };
        }
      }
    } else {
      this.logger.log(`Skipping DB risk checks for order ${order.id} due to missing portfolioId`);
    }

    // If we pass all checks
    this.dailyOrdersCount++;
    return { approved: true };
  }

  // Exposed for testing
  public resetDailyCount() {
    this.dailyOrdersCount = 0;
  }
}
