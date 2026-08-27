import { Injectable, Logger } from '@nestjs/common';
import { Candle, Timeframe } from '@stock-platform/types';
import { MarketDataProviderToken } from './market-data.provider';

@Injectable()
export class MockMarketDataProvider implements MarketDataProviderToken {
  private readonly logger = new Logger(MockMarketDataProvider.name);
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private basePrices: Map<string, number> = new Map();

  constructor() {
    // Initial deterministic base prices for mock symbols
    this.basePrices.set('RELIANCE', 2500);
    this.basePrices.set('TCS', 3500);
    this.basePrices.set('INFY', 1500);
  }

  async connect(): Promise<void> {
    this.logger.log('Mock Market Data Provider connected');
  }

  async disconnect(): Promise<void> {
    for (const [key, interval] of this.intervals.entries()) {
      clearInterval(interval);
      this.logger.log(`Cleared mock interval for ${key}`);
    }
    this.intervals.clear();
    this.logger.log('Mock Market Data Provider disconnected');
  }

  subscribeCandles(symbol: string, timeframe: Timeframe, callback: (candle: Candle) => void): void {
    const key = `${symbol}-${timeframe}`;
    if (this.intervals.has(key)) {
      this.logger.warn(`Already subscribed to ${key}`);
      return;
    }

    this.logger.log(`Subscribed to mock data for ${key}`);
    
    // Simulate incoming data based on timeframe. For dev, we send data faster than real-time.
    // E.g., '1m' updates every 1 second in mock mode to make testing easier.
    const intervalMs = this.getMockIntervalMs(timeframe);

    const intervalId = setInterval(() => {
      const candle = this.generateDeterministicCandle(symbol, timeframe);
      callback(candle);
    }, intervalMs);

    this.intervals.set(key, intervalId);
  }

  unsubscribeCandles(symbol: string, timeframe: Timeframe): void {
    const key = `${symbol}-${timeframe}`;
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
      this.logger.log(`Unsubscribed from mock data for ${key}`);
    }
  }

  async getHistoricalCandles(symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): Promise<Candle[]> {
    this.logger.log(`Generating mock historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const candles: Candle[] = [];
    let current = new Date(startDate);
    const msStep = this.getTimeframeMs(timeframe);

    while (current <= endDate) {
      candles.push(this.generateDeterministicCandle(symbol, timeframe, new Date(current)));
      current = new Date(current.getTime() + msStep);
    }

    return candles;
  }

  private generateDeterministicCandle(symbol: string, timeframe: Timeframe, timestamp: Date = new Date()): Candle {
    const base = this.basePrices.get(symbol) || 1000;
    
    // Use timestamp to generate deterministic sine wave variations
    const timeValue = timestamp.getTime() / 100000; 
    const volatility = base * 0.005; // 0.5% volatility
    
    const trend = Math.sin(timeValue) * volatility * 2;
    const noise = Math.cos(timeValue * 10) * volatility;

    const open = base + trend + noise;
    const high = open + Math.abs(Math.sin(timeValue * 5) * volatility);
    const low = open - Math.abs(Math.cos(timeValue * 5) * volatility);
    const close = low + Math.random() * (high - low); // Slight random for reality

    // Update base to create a random walk feel for future ticks
    this.basePrices.set(symbol, close);

    return {
      symbol,
      timeframe,
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000) + 1000,
    };
  }

  private getMockIntervalMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case '1m': return 1000; // 1 second in real life = 1m in mock
      case '5m': return 2000;
      case '15m': return 3000;
      case '1h': return 5000;
      case '1d': return 10000;
      default: return 1000;
    }
  }

  private getTimeframeMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }
}
