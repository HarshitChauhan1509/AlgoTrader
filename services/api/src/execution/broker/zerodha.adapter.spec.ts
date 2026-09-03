import { ZerodhaAdapter } from './zerodha.adapter';
import { Order } from '@stock-platform/types';

describe('ZerodhaAdapter', () => {
  let adapter: ZerodhaAdapter;

  beforeEach(() => {
    adapter = new ZerodhaAdapter();
  });

  it('maps system order to Kite Connect format and simulates execution', async () => {
    const order: Partial<Order> = {
      id: 'ord-123',
      symbol: 'RELIANCE',
      action: 'BUY',
      type: 'MARKET',
      quantity: 10,
      price: 0,
    };

    // Fasten timer for the simulateNetworkDelay
    jest.useFakeTimers();

    const placeOrderPromise = adapter.placeOrder(order as Order);
    jest.runAllTimers();

    const response = await placeOrderPromise;

    expect(['COMPLETE', 'REJECTED']).toContain(response.status);
    expect(response.rawPayload.tradingsymbol).toBe('RELIANCE');
    expect(response.rawPayload.transaction_type).toBe('BUY');
    expect(response.rawPayload.order_type).toBe('MARKET');
    expect(response.rawPayload.product).toBe('MIS');
    
    if (response.status === 'COMPLETE') {
      expect(response.brokerOrderId).toMatch(/^100000000/);
    } else {
      expect(response.message).toBeDefined();
    }

    jest.useRealTimers();
  });
});
