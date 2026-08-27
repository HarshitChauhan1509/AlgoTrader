export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d';

export interface Candle {
  symbol: string;
  timeframe: Timeframe;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Tick {
  symbol: string;
  timestamp: Date;
  price: number;
  volume: number;
}

export interface MarketDataProvider {
  /**
   * Connects to the underlying data source (e.g., WebSocket or Mock generator)
   */
  connect(): Promise<void>;

  /**
   * Disconnects from the underlying data source
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to real-time candles for a specific symbol and timeframe
   */
  subscribeCandles(symbol: string, timeframe: Timeframe, callback: (candle: Candle) => void): void;

  /**
   * Unsubscribe from real-time candles
   */
  unsubscribeCandles(symbol: string, timeframe: Timeframe): void;

  /**
   * Fetch historical candles for backtesting or initial indicator calculation
   */
  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date
  ): Promise<Candle[]>;
}
