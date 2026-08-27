import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Candle, Timeframe } from '@stock-platform/types';
import { RedisService } from '../redis/redis.service';
import { MarketDataProviderToken } from './providers/market-data.provider';

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly provider: MarketDataProviderToken,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.provider.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.provider.disconnect();
  }

  /**
   * Subscribes to candles and streams them into Redis so that the Strategy Engine
   * and other disconnected components can consume them.
   */
  startStreaming(symbol: string, timeframe: Timeframe): void {
    this.provider.subscribeCandles(symbol, timeframe, (candle: Candle) => {
      // Publish the incoming candle to a specific Redis channel
      const channel = `market-data:candles:${symbol}:${timeframe}`;
      
      // We stringify the payload. In production, consider protobuf or msgpack for speed
      this.redisService.publish(channel, JSON.stringify(candle)).catch(console.error);
    });
  }

  stopStreaming(symbol: string, timeframe: Timeframe): void {
    this.provider.unsubscribeCandles(symbol, timeframe);
  }

  async getHistorical(symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): Promise<Candle[]> {
    return this.provider.getHistoricalCandles(symbol, timeframe, startDate, endDate);
  }
}
