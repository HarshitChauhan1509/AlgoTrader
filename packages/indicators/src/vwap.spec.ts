import { Candle } from '@stock-platform/types';
import { vwap } from './vwap';

describe('VWAP Indicator', () => {
  it('calculates VWAP correctly', () => {
    const candles: Partial<Candle>[] = [
      { high: 10, low: 5, close: 9, volume: 100 }, // Typical = 8, TPV = 800, CV = 100 -> VWAP = 8
      { high: 12, low: 8, close: 10, volume: 200 }, // Typical = 10, TPV = 2000, CV = 300 -> Cum TPV = 2800 -> VWAP = 2800/300 = 9.333
    ];

    const result = vwap(candles as Candle[]);
    
    expect(result.length).toBe(2);
    expect(result[0]).toBe(8);
    expect(result[1]).toBeCloseTo(9.333, 2);
  });
});
