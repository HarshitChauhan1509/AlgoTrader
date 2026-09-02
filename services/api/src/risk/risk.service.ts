import { Injectable, Logger } from '@nestjs/common';
import { Order } from '@stock-platform/types';

export interface RiskEvaluationResult {
  approved: boolean;
  reason?: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // Configuration for risk limits (could be moved to a DB/Config module later)
  private readonly MAX_ORDER_VALUE = 100000; // 1 Lakh INR
  private readonly BLACKLISTED_SYMBOLS = ['GME', 'AMC', 'DOGE']; // Meme stocks example

  // Simple in-memory tracker for today's orders (cleared daily in a real system)
  private dailyOrdersCount = 0;
  private readonly MAX_DAILY_ORDERS = 100;

  /**
   * Evaluates a proposed order against all risk rules before execution.
   */
  public evaluateOrder(order: Order): RiskEvaluationResult {
    this.logger.log(`Evaluating risk for proposed order: ${order.action} ${order.quantity} ${order.symbol}`);

    // Rule 1: Check Blacklist
    if (this.BLACKLISTED_SYMBOLS.includes(order.symbol)) {
      const reason = `Symbol ${order.symbol} is blacklisted by risk parameters.`;
      this.logger.warn(reason);
      return { approved: false, reason };
    }

    // Rule 2: Max Order Value
    if (order.price && order.quantity) {
      const orderValue = order.price * order.quantity;
      if (orderValue > this.MAX_ORDER_VALUE) {
        const reason = `Order value ${orderValue} exceeds maximum allowed (${this.MAX_ORDER_VALUE}).`;
        this.logger.warn(reason);
        return { approved: false, reason };
      }
    }

    // Rule 3: Max Daily Orders (velocity check to prevent rogue loops)
    if (this.dailyOrdersCount >= this.MAX_DAILY_ORDERS) {
      const reason = `Exceeded maximum daily order limit (${this.MAX_DAILY_ORDERS}).`;
      this.logger.warn(reason);
      return { approved: false, reason };
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
