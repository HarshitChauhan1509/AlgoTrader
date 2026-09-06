import { Injectable, Logger } from '@nestjs/common';
import { Strategy, StrategyEvaluator } from '@stock-platform/strategy-core';
import { Candle, Signal } from '@stock-platform/types';
import { LiveEvaluationContext } from '../strategy-engine/evaluation-context';
import { CandleBuffer } from '../strategy-engine/candle-buffer';

export interface BacktestRequest {
  strategy: Strategy;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h';
  initialBalance: number;
  quantityPerTrade: number;
}

export interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  netProfit: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  trades: Array<{
    action: 'BUY' | 'SELL';
    price: number;
    timestamp: Date;
    quantity: number;
  }>;
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);
  private evaluator = new StrategyEvaluator();

  /**
   * Executes a strategy over a historical dataset without interacting with live brokers or risk DB.
   */
  public async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    this.logger.log(`Starting backtest for strategy: ${request.strategy.name} on ${request.symbol}`);

    const historicalCandles = this.generateHistoricalData(request.symbol, request.timeframe, 1000);
    const buffer = new CandleBuffer(200); // 200 max lookback

    let balance = request.initialBalance;
    let positionQty = 0;
    const trades: BacktestResult['trades'] = [];
    let winningTrades = 0;
    let losingTrades = 0;

    // To track profit/loss of individual trades
    let lastEntryPrice = 0;

        for (let i = 0; i < historicalCandles.length; i++) {
      const currentCandle = historicalCandles[i]!;
      buffer.addCandle(currentCandle);

      // Need enough data for indicators to warm up
      const currentBuffer = buffer.getCandles(request.symbol, request.timeframe);
      if (currentBuffer.length < 50) continue;

      const context = new LiveEvaluationContext(currentBuffer);
      const result = this.evaluator.evaluate(request.strategy, context);

      if (result.matched) {
        if (result.action === 'BUY' && positionQty === 0) {
          // Enter Long
          const tradeValue = currentCandle.close * request.quantityPerTrade;
          if (balance >= tradeValue) {
            balance -= tradeValue;
            positionQty += request.quantityPerTrade;
            lastEntryPrice = currentCandle.close;

            trades.push({
              action: 'BUY',
              price: currentCandle.close,
              timestamp: currentCandle.timestamp,
              quantity: request.quantityPerTrade,
            });
          }
        } else if (result.action === 'SELL' && positionQty > 0) {
          // Exit Long
          const tradeValue = currentCandle.close * positionQty;
          balance += tradeValue;

          if (currentCandle.close > lastEntryPrice) {
            winningTrades++;
          } else {
            losingTrades++;
          }

          trades.push({
            action: 'SELL',
            price: currentCandle.close,
            timestamp: currentCandle.timestamp,
            quantity: positionQty,
          });

          positionQty = 0;
          lastEntryPrice = 0;
        }
      }
    }

    // Force close any open positions at the end of the backtest
    if (positionQty > 0) {
      const lastCandle = historicalCandles[historicalCandles.length - 1]!;
      const tradeValue = lastCandle.close * positionQty;
      balance += tradeValue;
      if (lastCandle.close > lastEntryPrice) winningTrades++;
      else losingTrades++;
      trades.push({
        action: 'SELL',
        price: lastCandle.close,
        timestamp: lastCandle.timestamp,
        quantity: positionQty,
      });
      positionQty = 0;
    }

    return {
      initialBalance: request.initialBalance,
      finalBalance: balance,
      netProfit: balance - request.initialBalance,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      trades,
    };
  }

  /**
   * Generates a realistic-looking sine wave of historical candles for backtesting.
   * In a real system, this would query TimescaleDB.
   */
  private generateHistoricalData(symbol: string, timeframe: string, count: number): Candle[] {
    const candles: Candle[] = [];
    const basePrice = 2500;
    let currentTimestamp = new Date();
    // Go backwards 'count' steps, then build forwards
    currentTimestamp = new Date(currentTimestamp.getTime() - count * 15 * 60 * 1000); 

    for (let i = 0; i < count; i++) {
      // Sine wave with some random noise and upward drift
      const noise = (Math.random() - 0.5) * 10;
      const trend = i * 0.1;
      const sine = Math.sin(i / 10) * 50;
      const open = basePrice + sine + trend + noise;
      const high = open + Math.random() * 5;
      const low = open - Math.random() * 5;
      const close = basePrice + Math.sin((i + 1) / 10) * 50 + trend + (Math.random() - 0.5) * 10;

      candles.push({
        symbol,
        timeframe: timeframe as any,
        timestamp: new Date(currentTimestamp.getTime() + i * 15 * 60 * 1000),
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000) + 1000,
      });
    }

    return candles;
  }
}

