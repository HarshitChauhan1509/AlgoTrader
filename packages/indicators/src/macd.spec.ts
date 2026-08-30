import { macd } from './macd';

describe('MACD Indicator', () => {
  it('calculates MACD values correctly', () => {
    // Generate some dummy data
    const data = Array.from({ length: 40 }, (_, i) => 100 + i + (i % 2 === 0 ? 2 : -2));
    
    // fast: 12, slow: 26, signal: 9
    const result = macd(data, 12, 26, 9);
    
    expect(result.length).toBe(40);
    
    // First 25 values should be null because slowPeriod is 26 (needs 26 values, indices 0-25).
    // The MACD line starts at index 25.
    // The signal line needs 9 values of MACD, so it starts at 25 + 9 - 1 = 33.
    expect(result[32]).toBeNull();
    
    const validPoint = result[33];
    expect(validPoint).toBeDefined();
    expect(validPoint).not.toBeNull();
    
    if (validPoint) {
      expect(typeof validPoint.macd).toBe('number');
      expect(typeof validPoint.signal).toBe('number');
      expect(typeof validPoint.histogram).toBe('number');
      expect(validPoint.histogram).toBe(validPoint.macd - validPoint.signal);
    }
  });

  it('throws on invalid periods', () => {
    expect(() => macd([10, 20], 26, 12)).toThrow('fastPeriod must be less than slowPeriod');
  });
});
