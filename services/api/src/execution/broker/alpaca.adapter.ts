import { Injectable, Logger } from '@nestjs/common';
import { BrokerAdapter, BrokerOrderResponse } from './broker.adapter';
import { Order } from '@stock-platform/types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlpacaAdapter implements BrokerAdapter {
  private readonly logger = new Logger(AlpacaAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService, credentials?: any) {
    const isPaper = this.configService.get<string>('ALPACA_PAPER', 'true') === 'true';
    this.baseUrl = isPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
    this.apiKey = credentials?.apiKey || this.configService.get<string>('ALPACA_API_KEY', '');
    this.apiSecret = credentials?.apiSecret || this.configService.get<string>('ALPACA_API_SECRET', '');
    
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Alpaca API credentials missing. Orders will fail if ALPACA is selected.');
    }
  }

  async placeOrder(order: Order): Promise<BrokerOrderResponse> {
    this.logger.log(`Placing ${order.type} ${order.action} order for ${order.quantity} ${order.symbol} via Alpaca`);

    // Prepare Alpaca payload
    const payload: any = {
      symbol: order.symbol,
      qty: order.quantity,
      side: order.action.toLowerCase(), // 'buy' or 'sell'
      type: order.type.toLowerCase(),   // 'market', 'limit', etc.
      time_in_force: 'gtc', // Good 'Til Canceled
    };

    if (order.type === 'LIMIT' && order.price) {
      payload.limit_price = order.price.toString();
    }

    // Bracket Orders (SL / TP)
    if (order.stopLossPrice || order.takeProfitPrice) {
      payload.order_class = 'bracket';
      
      if (order.takeProfitPrice) {
        payload.take_profit = {
          limit_price: order.takeProfitPrice.toString()
        };
      }
      
      if (order.stopLossPrice) {
        payload.stop_loss = {
          stop_price: order.stopLossPrice.toString()
        };
      }
    } else if (order.trailingDistance) {
      payload.type = 'trailing_stop';
      payload.trail_price = order.trailingDistance.toString();
    }

    try {
      const response = await fetch(`${this.baseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.apiSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Alpaca order rejected: ${JSON.stringify(data)}`);
        return {
          brokerOrderId: '',
          status: 'REJECTED',
          message: data.message || 'Unknown error from Alpaca',
        };
      }

      let mappedStatus: 'COMPLETE' | 'REJECTED' | 'OPEN' = 'OPEN';
      if (data.status === 'filled') mappedStatus = 'COMPLETE';
      if (data.status === 'rejected' || data.status === 'canceled') mappedStatus = 'REJECTED';

      return {
        brokerOrderId: data.id,
        status: mappedStatus,
        rawPayload: data,
      };
    } catch (e: any) {
      this.logger.error(`Failed to reach Alpaca API: ${e.message}`);
      return {
        brokerOrderId: '',
        status: 'REJECTED',
        message: e.message,
      };
    }
  }
}
