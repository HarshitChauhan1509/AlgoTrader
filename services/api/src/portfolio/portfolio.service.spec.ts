import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { Order } from '@stock-platform/types';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;
  let mockSubscribe: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(async () => {
    mockSubscribe = jest.fn();
    mockOn = jest.fn();

    const mockDuplicateClient = {
      subscribe: mockSubscribe,
      on: mockOn,
    };

    redisService = {
      getClient: jest.fn().mockReturnValue({
        duplicate: jest.fn().mockReturnValue(mockDuplicateClient),
      }),
    } as any;

    const mockTx = {
      portfolio: {
        update: jest.fn().mockResolvedValue({ id: 'port-1', currentBalance: 99000 }),
      },
      position: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }
    };

    prismaService = {
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return await cb(mockTx);
      }),
      portfolio: {
        findFirst: jest.fn().mockResolvedValue({ id: 'port-1', currentBalance: 100000 })
      }
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: RedisService, useValue: redisService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('subscribes to execution:orders topic', async () => {
    await service.onModuleInit();
    expect(mockSubscribe).toHaveBeenCalledWith('execution:orders');
    expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('processes EXECUTED order by creating a position and updating balance', async () => {
    await service.onModuleInit();
    
    // Extract the message handler
    const messageHandler = mockOn.mock.calls.find(call => call[0] === 'message')[1];
    
    const mockOrder: Order = {
      id: 'ord-123',
      action: 'BUY',
      symbol: 'RELIANCE',
      type: 'MARKET',
      quantity: 10,
      price: 2500,
      status: 'EXECUTED',
      timestamp: new Date()
    };

    await messageHandler('execution:orders', JSON.stringify(mockOrder));

    expect(prismaService.$transaction).toHaveBeenCalled();
  });
});
