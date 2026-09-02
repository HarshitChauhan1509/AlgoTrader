import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from './risk.service';
import { Order } from '@stock-platform/types';

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskService],
    }).compile();

    service = module.get<RiskService>(RiskService);
  });

  afterEach(() => {
    service.resetDailyCount();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('approves a valid order', () => {
    const order: Partial<Order> = { symbol: 'RELIANCE', price: 1500, quantity: 10 };
    const result = service.evaluateOrder(order as Order);
    expect(result.approved).toBe(true);
  });

  it('rejects an order that exceeds MAX_ORDER_VALUE', () => {
    const order: Partial<Order> = { symbol: 'RELIANCE', price: 1500, quantity: 1000 }; // 1.5M > 100k
    const result = service.evaluateOrder(order as Order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('exceeds maximum allowed');
  });

  it('rejects an order for a blacklisted symbol', () => {
    const order: Partial<Order> = { symbol: 'GME', price: 100, quantity: 1 };
    const result = service.evaluateOrder(order as Order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('blacklisted');
  });

  it('rejects orders when daily limit is exceeded', () => {
    for (let i = 0; i < 100; i++) {
      const order: Partial<Order> = { symbol: 'RELIANCE', price: 100, quantity: 1 };
      service.evaluateOrder(order as Order);
    }
    
    // The 101st order should fail
    const order: Partial<Order> = { symbol: 'RELIANCE', price: 100, quantity: 1 };
    const result = service.evaluateOrder(order as Order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('Exceeded maximum daily order limit');
  });
});
