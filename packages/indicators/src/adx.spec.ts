import { Candle } from '@stock-platform/types';
import { adx } from './adx';

describe('ADX Indicator', () => {
  it('calculates ADX values correctly', () => {
    // We need at least 2 * period candles for the first ADX value.
    // Let's use period = 2, so we need 4 candles.
    const candles: Partial<Candle>[] = [
      { high: 10, low: 5, close: 8 },
      { high: 12, low: 7, close: 11 }, // Up move > down move -> +DM
      { high: 15, low: 10, close: 14 }, // Up move > down move -> +DM
      { high: 16, low: 12, close: 15 }, // Up move > down move -> +DM
      { high: 14, low: 9, close: 10 },  // Down move -> -DM
    ];

    const result = adx(candles as Candle[], 2);
    
    expect(result.length).toBe(5);
    
    // Period = 2. First ADX is at index 2*2 - 1 = 3.
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    
    expect(result[3]).toBeDefined();
    expect(result[3]?.adx).toBeGreaterThan(0);
    expect(result[3]?.plusDi).toBeGreaterThan(0);
    expect(result[3]?.minusDi).toBeGreaterThanOrEqual(0);
    
    expect(result[4]).toBeDefined();
  });
});
