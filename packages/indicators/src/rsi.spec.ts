import { rsi } from './rsi';

describe('RSI Indicator', () => {
  it('calculates RSI values correctly', () => {
    // Basic test
    const data = [10, 11, 12, 11, 10, 9, 10];
    const result = rsi(data, 3);
    
    // Period = 3. We need 4 points for the first RSI (indices 0 to 3)
    // Points: 10, 11, 12, 11
    // Diffs: +1, +1, -1
    // sumGain = 2, avgGain = 2/3
    // sumLoss = 1, avgLoss = 1/3
    // RS = 2/3 / 1/3 = 2
    // RSI = 100 - (100 / (1 + 2)) = 100 - 33.333 = 66.666
    
    expect(result.length).toBe(7);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    
    expect(result[3]).toBeCloseTo(66.66, 1);
  });
});
