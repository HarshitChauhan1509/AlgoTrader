import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { MarketDataService } from '../market-data/market-data.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MarketDataGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MarketDataGateway.name);
  private subscriberClient: any;

  constructor(
    private readonly redisService: RedisService,
    private readonly marketDataService: MarketDataService
  ) {}

  async afterInit(server: Server) {
    this.logger.log('Market Data WebSocket Gateway Initialized');

    // Duplicate client for subscribing to Redis channels without blocking the main client
    this.subscriberClient = this.redisService.getClient().duplicate();
    await this.subscriberClient.psubscribe('market-data:candles:*:*');
    await this.subscriberClient.psubscribe('market-data:depth:*');
    await this.subscriberClient.subscribe('execution:orders');

    // Listen for market data events from Redis and broadcast to active WS rooms
    this.subscriberClient.on('pmessage', (pattern: string, channel: string, message: string) => {
      const parts = channel.split(':');
      if (pattern === 'market-data:candles:*:*' && parts.length === 4) {
        const symbol = parts[2];
        const timeframe = parts[3];
        const room = `${symbol}-${timeframe}`;
        
        try {
          const candleData = JSON.parse(message);
          this.server.to(room).emit('candle', candleData);
        } catch (e) {
          this.logger.error(`Error parsing candle from redis: ${message}`, e);
        }
      } else if (pattern === 'market-data:depth:*' && parts.length === 3) {
        const symbol = parts[2];
        const room = `${symbol}-depth`;
        try {
          const orderBook = JSON.parse(message);
          this.server.to(room).emit('orderBookUpdate', orderBook);
        } catch (e) {
          this.logger.error(`Error parsing orderbook from redis: ${message}`, e);
        }
      }
    });

    this.subscriberClient.on('message', (channel: string, message: string) => {
      if (channel === 'execution:orders') {
        try {
          const order = JSON.parse(message);
          this.server.emit('orderUpdate', order);
        } catch (e) {
          this.logger.error(`Error parsing order from redis: ${message}`, e);
        }
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Called when a frontend client requests to stream a specific symbol/timeframe.
   * e.g., socket.emit('subscribe', { symbol: 'RELIANCE', timeframe: '15m' })
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { symbol: string; timeframe: string }) {
    if (!payload || !payload.symbol || !payload.timeframe) {
      return { status: 'error', message: 'Missing symbol or timeframe' };
    }
    const room = `${payload.symbol}-${payload.timeframe}`;
    const depthRoom = `${payload.symbol}-depth`;
    
    client.join(room);
    client.join(depthRoom);
    
    // Start backend streaming if this is the first client (or just idly let it be handled by redis deduplication in production)
    this.marketDataService.startStreaming(payload.symbol, payload.timeframe as any);
    this.marketDataService.startStreamingOrderBook(payload.symbol);
    
    this.logger.log(`Client ${client.id} joined rooms ${room} and ${depthRoom}`);
    return { status: 'subscribed', room, depthRoom };
  }

  /**
   * Called when a frontend client requests to stop streaming a specific symbol/timeframe.
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { symbol: string; timeframe: string }) {
    if (!payload || !payload.symbol || !payload.timeframe) {
      return { status: 'error', message: 'Missing symbol or timeframe' };
    }
    const room = `${payload.symbol}-${payload.timeframe}`;
    const depthRoom = `${payload.symbol}-depth`;
    
    client.leave(room);
    client.leave(depthRoom);
    
    // In production we would reference count. Here we can just stop it if needed, or leave it running.
    // We'll leave it running or stop it for demo purposes:
    this.marketDataService.stopStreamingOrderBook(payload.symbol);
    
    this.logger.log(`Client ${client.id} left rooms ${room} and ${depthRoom}`);
    return { status: 'unsubscribed', room, depthRoom };
  }
}
