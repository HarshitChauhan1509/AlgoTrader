import { Candle, Timeframe } from '@stock-platform/types';

export class CandleBuffer {
  // Map of `symbol-timeframe` to an array of Candles
  private buffers: Map<string, Candle[]> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  public addCandle(candle: Candle): void {
    const key = this.getKey(candle.symbol, candle.timeframe);
    if (!this.buffers.has(key)) {
      this.buffers.set(key, []);
    }

    const buffer = this.buffers.get(key)!;
    
    // Check if it's updating the current candle or a new one based on timestamp
    if (buffer.length > 0) {
      const last = buffer[buffer.length - 1];
      if (last!.timestamp.getTime() === candle.timestamp.getTime()) {
        buffer[buffer.length - 1] = candle;
        return;
      }
    }

    buffer.push(candle);

    if (buffer.length > this.maxSize) {
      buffer.shift();
    }
  }

  public getCandles(symbol: string, timeframe: Timeframe): Candle[] {
    return this.buffers.get(this.getKey(symbol, timeframe)) || [];
  }

  public clear(): void {
    this.buffers.clear();
  }

  private getKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}-${timeframe}`;
  }
}
