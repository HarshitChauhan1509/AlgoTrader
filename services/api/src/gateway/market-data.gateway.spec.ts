import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataGateway } from './market-data.gateway';
import { RedisService } from '../redis/redis.service';
import { Socket } from 'socket.io';

describe('MarketDataGateway', () => {
  let gateway: MarketDataGateway;
  let redisService: jest.Mocked<RedisService>;
  let mockSubscribe: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(async () => {
    mockSubscribe = jest.fn();
    mockOn = jest.fn();

    const mockDuplicateClient = {
      psubscribe: mockSubscribe,
      on: mockOn,
    };

    redisService = {
      getClient: jest.fn().mockReturnValue({
        duplicate: jest.fn().mockReturnValue(mockDuplicateClient),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataGateway,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    gateway = module.get<MarketDataGateway>(MarketDataGateway);
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('subscribes to redis pattern on init', async () => {
    await gateway.afterInit(gateway.server);
    expect(mockSubscribe).toHaveBeenCalledWith('market-data:candles:*:*');
    expect(mockOn).toHaveBeenCalledWith('pmessage', expect.any(Function));
  });

  it('allows clients to subscribe to a room', () => {
    const mockClient = { id: 'client-1', join: jest.fn() } as unknown as Socket;
    const response = gateway.handleSubscribe(mockClient, { symbol: 'TCS', timeframe: '1h' });
    
    expect(mockClient.join).toHaveBeenCalledWith('TCS-1h');
    expect(response).toEqual({ status: 'subscribed', room: 'TCS-1h' });
  });

  it('allows clients to unsubscribe from a room', () => {
    const mockClient = { id: 'client-1', leave: jest.fn() } as unknown as Socket;
    const response = gateway.handleUnsubscribe(mockClient, { symbol: 'TCS', timeframe: '1h' });
    
    expect(mockClient.leave).toHaveBeenCalledWith('TCS-1h');
    expect(response).toEqual({ status: 'unsubscribed', room: 'TCS-1h' });
  });
});
