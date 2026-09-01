import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Strategy, StrategyEvaluator } from '@stock-platform/strategy-core';
import { Candle, Timeframe } from '@stock-platform/types';
import { RedisService } from '../redis/redis.service';
import { CandleBuffer } from './candle-buffer';
import { LiveEvaluationContext } from './evaluation-context';

@Injectable()
export class StrategyEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StrategyEngineService.name);
  private readonly buffer = new CandleBuffer(200); // Keep last 200 candles
  private readonly evaluator = new StrategyEvaluator();
  
  // In a real database, this would be loaded from PostgreSQL.
  private activeStrategies: Strategy[] = [];

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.logger.log('Initializing Strategy Engine...');
    
    // Subscribe to all market data channels (assuming standard naming convention)
    const client = this.redisService.getClient();
    
    // We need a duplicate client for subscribing because once a client is in subscriber mode,
    // it can't publish.
    const subClient = client.duplicate();
    await subClient.psubscribe('market-data:candles:*:*');

    subClient.on('pmessage', (pattern, channel, message) => {
      try {
        const candle: Candle = JSON.parse(message);
        // Ensure timestamp is parsed as Date since JSON.stringify turns it into string
        candle.timestamp = new Date(candle.timestamp);
        this.handleNewCandle(candle);
      } catch (e) {
        this.logger.error(`Failed to process candle from ${channel}`, e);
      }
    });

    this.logger.log('Subscribed to market data feeds.');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Strategy Engine...');
  }

  public addStrategy(strategy: Strategy) {
    this.activeStrategies.push(strategy);
    this.logger.log(`Activated strategy: ${strategy.name}`);
  }

  private handleNewCandle(candle: Candle) {
    this.buffer.addCandle(candle);

    const relevantStrategies = this.activeStrategies.filter(
      (s) => s.timeframe === candle.timeframe
    );

    if (relevantStrategies.length === 0) return;

    const candles = this.buffer.getCandles(candle.symbol, candle.timeframe);
    const context = new LiveEvaluationContext(candles);

    for (const strategy of relevantStrategies) {
      const result = this.evaluator.evaluate(strategy, context);
      
      if (result.matched) {
        this.logger.log(`💥 SIGNAL GENERATED: ${strategy.action} on ${candle.symbol} by ${strategy.name}`);
        
        // Publish signal to Redis so the Execution Engine (Phase 6) can pick it up
        this.redisService.publish(
          'strategy:signals',
          JSON.stringify({
            symbol: candle.symbol,
            timeframe: candle.timeframe,
            timestamp: candle.timestamp,
            strategyId: strategy.id,
            action: strategy.action,
            price: candle.close,
          })
        ).catch(err => this.logger.error('Failed to publish signal', err));
      }
    }
  }
}
