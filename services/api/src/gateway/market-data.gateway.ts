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

  constructor(private readonly redisService: RedisService) {}

  async afterInit(server: Server) {
    this.logger.log('Market Data WebSocket Gateway Initialized');

    // Duplicate client for subscribing to Redis channels without blocking the main client
    this.subscriberClient = this.redisService.getClient().duplicate();
    await this.subscriberClient.psubscribe('market-data:candles:*:*');

    // Listen for market data events from Redis and broadcast to active WS rooms
    this.subscriberClient.on('pmessage', (pattern: string, channel: string, message: string) => {
      // e.g., channel = "market-data:candles:RELIANCE:15m"
      const parts = channel.split(':');
      if (parts.length === 4) {
        const symbol = parts[2];
        const timeframe = parts[3];
        const room = `${symbol}-${timeframe}`;
        
        // Broadcast the JSON message to anyone subscribed to this room
        try {
          const candleData = JSON.parse(message);
          this.server.to(room).emit('candle', candleData);
        } catch (e) {
          this.logger.error(`Error parsing candle from redis: ${message}`, e);
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
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { status: 'subscribed', room };
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
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { status: 'unsubscribed', room };
  }
}

