import { Order } from '@stock-platform/types';

export interface BrokerOrderResponse {
  brokerOrderId: string;
  status: 'COMPLETE' | 'REJECTED' | 'OPEN';
  message?: string;
  rawPayload?: any;
}

export interface BrokerAdapter {
  /**
   * Translates a generic system Order into a broker-specific API call.
   */
  placeOrder(order: Order): Promise<BrokerOrderResponse>;
}

export const BROKER_ADAPTER_TOKEN = Symbol('BROKER_ADAPTER_TOKEN');
