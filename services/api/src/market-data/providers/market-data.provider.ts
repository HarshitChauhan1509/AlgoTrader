import { Candle, MarketDataProvider, Timeframe } from '@stock-platform/types';

/**
 * Abstract class acting as a Dependency Injection token for NestJS.
 * Any actual provider (Mock, Zerodha, Upstox) will implement this.
 */
export abstract class MarketDataProviderToken implements MarketDataProvider {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract subscribeCandles(symbol: string, timeframe: Timeframe, callback: (candle: Candle) => void): void;
  abstract unsubscribeCandles(symbol: string, timeframe: Timeframe): void;
  abstract getHistoricalCandles(symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): Promise<Candle[]>;
}
