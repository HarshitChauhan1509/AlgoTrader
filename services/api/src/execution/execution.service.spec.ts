import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { RedisService } from '../redis/redis.service';
import { RiskService } from '../risk/risk.service';
import { BROKER_ADAPTER_TOKEN } from './broker/broker.adapter';
import { Signal, Order } from '@stock-platform/types';

describe('ExecutionService', () => {
  let service: ExecutionService;
  let redisService: jest.Mocked<RedisService>;
  let mockSubscribe: jest.Mock;
  let mockOn: jest.Mock;
  let mockPublish: jest.Mock;

  beforeEach(async () => {
    mockSubscribe = jest.fn();
    mockOn = jest.fn();
    mockPublish = jest.fn().mockResolvedValue(1);

    const mockDuplicateClient = {
      subscribe: mockSubscribe,
      on: mockOn,
    };

    redisService = {
      getClient: jest.fn().mockReturnValue({
        duplicate: jest.fn().mockReturnValue(mockDuplicateClient),
      }),
      publish: mockPublish,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RiskService, useValue: { evaluateOrder: jest.fn().mockReturnValue({ approved: true }) } },
        { provide: BROKER_ADAPTER_TOKEN, useValue: { placeOrder: jest.fn().mockResolvedValue({ status: 'COMPLETE' }) } },
        ExecutionService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('subscribes to strategy:signals on init', async () => {
    await service.onModuleInit();
    expect(mockSubscribe).toHaveBeenCalledWith('strategy:signals');
    expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('handles an incoming signal, creates an order, and publishes updates', async () => {
    jest.useFakeTimers();

    await service.onModuleInit();
    
    // Extract the registered message handler
    const messageHandler = mockOn.mock.calls.find(call => call[0] === 'message')[1];

    const signal: Signal = {
      symbol: 'TATASTEEL',
      timeframe: '15m',
      timestamp: new Date(),
      strategyId: 'strat-1',
      action: 'BUY',
      price: 150.5,
    };

    // Simulate Redis emitting the signal
    await messageHandler('strategy:signals', JSON.stringify(signal));

    // The service should have immediately published a PENDING order
    expect(mockPublish).toHaveBeenCalledWith('execution:orders', expect.any(String));
    
    // Parse the published message to inspect the order
    const publishedOrderRaw = mockPublish.mock.calls[0][1];
    const pendingOrder: Order = JSON.parse(publishedOrderRaw);
    
    expect(pendingOrder.status).toBe('PENDING');
    expect(pendingOrder.action).toBe('BUY');
    expect(pendingOrder.symbol).toBe('TATASTEEL');
    expect(pendingOrder.quantity).toBe(1);

    // Fast-forward time by 1000ms to allow the mocked setTimeout (delay) to trigger
    jest.advanceTimersByTime(1000);

    // After the delay, it should publish an updated state (EXECUTED or FAILED)
    expect(mockPublish).toHaveBeenCalledTimes(2);
    
    const finalOrderRaw = mockPublish.mock.calls[1][1];
    const finalOrder: Order = JSON.parse(finalOrderRaw);
    
    expect(['EXECUTED', 'FAILED']).toContain(finalOrder.status);
    expect(finalOrder.id).toBe(pendingOrder.id);

    jest.useRealTimers();
  });
});


