import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Strategy, StrategyEvaluator } from '@stock-platform/strategy-core';
import { Candle, Timeframe } from '@stock-platform/types';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { CandleBuffer } from './candle-buffer';
import { LiveEvaluationContext } from './evaluation-context';

@Injectable()
export class StrategyEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StrategyEngineService.name);
  private readonly buffer = new CandleBuffer(200); // Keep last 200 candles
  private readonly evaluator = new StrategyEvaluator();
  
  private activeStrategies: Strategy[] = [];

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Strategy Engine...');
    
    await this.reloadActiveStrategies();

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

  async reloadActiveStrategies() {
    const dbStrategies = await this.prisma.strategy.findMany({
      where: { enabled: true }
    });
    
    this.activeStrategies = dbStrategies.map(s => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      timeframe: s.timeframe as Timeframe,
      action: s.action as any,
      conditions: (s.definition as any).conditions || [],
      stopLossDistance: (s.definition as any).stopLossDistance,
      takeProfitDistance: (s.definition as any).takeProfitDistance,
      trailingStopDistance: (s.definition as any).trailingStopDistance,
      symbol: (s.definition as any).symbol, // Dynamic property for engine filtering
    }));
    this.logger.log(`Reloaded ${this.activeStrategies.length} active strategies from database.`);
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
      (s: any) => s.timeframe === candle.timeframe && (!s.symbol || s.symbol === candle.symbol)
    );

    if (relevantStrategies.length === 0) return;

    const candles = this.buffer.getCandles(candle.symbol, candle.timeframe);
    const context = new LiveEvaluationContext(candles);

    for (const strategy of relevantStrategies) {
      const result = this.evaluator.evaluate(strategy, context);
      
      if (result.matched) {
        this.logger.log(`💥 SIGNAL GENERATED: ${strategy.action} on ${candle.symbol} by ${strategy.name}`);
        
        // Publish signal to Redis so the Execution Engine (Phase 6) can pick it up
        let stopLossPrice;
        let takeProfitPrice;
        if (strategy.stopLossDistance) {
          stopLossPrice = strategy.action === 'BUY' ? candle.close - strategy.stopLossDistance : candle.close + strategy.stopLossDistance;
        }
        if (strategy.takeProfitDistance) {
          takeProfitPrice = strategy.action === 'BUY' ? candle.close + strategy.takeProfitDistance : candle.close - strategy.takeProfitDistance;
        }
        const signalPayload = {
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          timestamp: candle.timestamp,
          strategyId: strategy.id,
          userId: (strategy as any).userId,
          action: strategy.action,
          price: candle.close,
          stopLossPrice,
          takeProfitPrice,
          trailingDistance: strategy.trailingStopDistance,
        };
        this.redisService.publish(
          'strategy:signals',
          JSON.stringify(signalPayload)
        ).catch(err => this.logger.error('Failed to publish signal', err));
      }
    }
  }
}



