import { Injectable, Logger } from '@nestjs/common';
import { BrokerAdapter, BrokerOrderResponse } from './broker.adapter';
import { Order } from '@stock-platform/types';
import * as crypto from 'crypto';

/**
 * Maps system orders to Zerodha Kite Connect API format.
 */
@Injectable()
export class ZerodhaAdapter implements BrokerAdapter {
  private readonly logger = new Logger(ZerodhaAdapter.name);

  async placeOrder(order: Order): Promise<BrokerOrderResponse> {
    // 1. Map system generic order to Zerodha specific format
    const kitePayload = {
      tradingsymbol: order.symbol,
      exchange: 'NSE', // Hardcoded for this phase, could be dynamic
      transaction_type: order.action === 'BUY' ? 'BUY' : 'SELL',
      order_type: order.type === 'MARKET' ? 'MARKET' : 'LIMIT',
      quantity: order.quantity,
      price: order.price || 0,
      product: 'MIS', // Intraday (MIS) vs Delivery (CNC)
      validity: 'DAY',
    };

    this.logger.log(`[Zerodha] Formatted Order Payload: ${JSON.stringify(kitePayload)}`);

    // 2. Simulate Network Request to https://api.kite.trade/orders/regular
    await this.simulateNetworkDelay();

    // 3. Simulate Broker Response
    const isSuccess = Math.random() > 0.05; // 95% success rate

    if (isSuccess) {
      const brokerOrderId = `100000000${Math.floor(Math.random() * 10000)}`;
      this.logger.log(`[Zerodha] Order Placed Successfully. Broker ID: ${brokerOrderId}`);
      return {
        brokerOrderId,
        status: 'COMPLETE',
        rawPayload: kitePayload,
      };
    } else {
      this.logger.warn(`[Zerodha] Order Rejected by Broker`);
      return {
        brokerOrderId: '',
        status: 'REJECTED',
        message: 'RMS: Margin Insufficient',
        rawPayload: kitePayload,
      };
    }
  }

  private simulateNetworkDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 300) + 100;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
