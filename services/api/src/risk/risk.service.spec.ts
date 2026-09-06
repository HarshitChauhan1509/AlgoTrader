import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from './risk.service';
import { PrismaService } from '../prisma/prisma.service';
import { Order } from '@stock-platform/types';

describe('RiskService', () => {
  let service: RiskService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaService = {
      portfolio: { findUnique: jest.fn().mockResolvedValue({ currentBalance: 200000 }) },
      position: { findUnique: jest.fn().mockResolvedValue({ quantity: 50 }) }
    } as any;
    
    service = new RiskService(prismaService);
    service.resetDailyCount();
  });

  it('should return approved for valid order', async () => {
    const validOrder: Order = {
      id: 'o-1',
      symbol: 'TCS',
      action: 'BUY',
      type: 'MARKET',
      quantity: 1,
      price: 3500,
      timestamp: new Date(),
      status: 'PENDING'
    };
    const result = await service.evaluateOrder(validOrder);
    expect(result.approved).toBe(true);
  });

  it('should reject blacklisted symbols', async () => {
    const order: Order = {
      id: 'o-3',
      symbol: 'GME',
      action: 'BUY',
      type: 'MARKET',
      quantity: 1,
      price: 100,
      timestamp: new Date(),
      status: 'PENDING'
    };
    const result = await service.evaluateOrder(order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('blacklisted');
  });

  it('should reject orders exceeding max value', async () => {
    const order: Order = {
      id: 'o-2',
      symbol: 'RELIANCE',
      action: 'BUY',
      type: 'MARKET',
      quantity: 100,
      price: 3500, // 3,50,000 > 1,00,000 limit
      timestamp: new Date(),
      status: 'PENDING'
    };
    const result = await service.evaluateOrder(order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('exceeds maximum allowed');
  });

  it('should reject after max daily orders', async () => {
    for (let i = 0; i < 100; i++) {
      await service.evaluateOrder({
        id: `dummy-${i}`,
        symbol: 'TCS',
        action: 'BUY',
        type: 'MARKET',
        quantity: 1,
        price: 100,
        timestamp: new Date(),
        status: 'PENDING'
      });
    }

    const order: Order = {
      id: 'o-4',
      symbol: 'RELIANCE',
      action: 'BUY',
      type: 'MARKET',
      quantity: 1,
      price: 100,
      timestamp: new Date(),
      status: 'PENDING'
    };
    const result = await service.evaluateOrder(order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('Exceeded maximum daily order limit');
  });

  it('should reject BUY if portfolio balance is insufficient', async () => {
    prismaService.portfolio.findUnique = jest.fn().mockResolvedValue({ currentBalance: 500 });
    const order: Order = { id: 'o-5', symbol: 'RELIANCE', action: 'BUY', type: 'MARKET', quantity: 10, price: 100, timestamp: new Date(), portfolioId: 'p-1', status: 'PENDING' };
    const result = await service.evaluateOrder(order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('Insufficient funds');
  });

  it('should reject SELL if position quantity is insufficient', async () => {
    prismaService.portfolio.findUnique = jest.fn().mockResolvedValue({ currentBalance: 100000 });
    prismaService.position.findUnique = jest.fn().mockResolvedValue({ quantity: 5 });
    const order: Order = { id: 'o-6', symbol: 'RELIANCE', action: 'SELL', type: 'MARKET', quantity: 10, price: 100, timestamp: new Date(), portfolioId: 'p-1', status: 'PENDING' };
    const result = await service.evaluateOrder(order);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('Insufficient holdings');
  });
});
