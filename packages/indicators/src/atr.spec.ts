import { Candle } from '@stock-platform/types';
import { atr } from './atr';

describe('ATR Indicator', () => {
  it('calculates ATR correctly', () => {
    const candles: Partial<Candle>[] = [
      { high: 10, low: 5, close: 8 }, // TR = 5
      { high: 12, low: 7, close: 11 }, // TR = 12-7=5, 12-8=4, 7-8=1 -> TR = 5
      { high: 15, low: 10, close: 14 }, // TR = 15-10=5, 15-11=4, 10-11=1 -> TR = 5
      { high: 16, low: 12, close: 15 }, // TR = 16-12=4, 16-14=2, 12-14=2 -> TR = 4
    ];

    const result = atr(candles as Candle[], 2);
    
    // TR array: [5, 5, 5, 4]
    // Period = 2
    // Index 0: null
    // Index 1: null
    // Index 2 (starts using TR[1] and TR[2]): average of (5, 5) = 5
    // Index 3: (5 * 1 + 4) / 2 = 4.5
    
    expect(result.length).toBe(4);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(5);
    expect(result[3]).toBeCloseTo(4.5);
  });
});
