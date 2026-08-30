import { bollingerBands } from './bollinger-bands';

describe('Bollinger Bands', () => {
  it('calculates Bollinger Bands correctly', () => {
    // 5 values, period 3
    const data = [10, 12, 14, 12, 10];
    const result = bollingerBands(data, 3, 2);
    
    expect(result.length).toBe(5);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    
    // Index 2: values [10, 12, 14], mean = 12
    // Var = ((10-12)^2 + (12-12)^2 + (14-12)^2) / 3 = (4 + 0 + 4) / 3 = 8/3 = 2.666
    // StdDev = sqrt(2.666) = 1.63299
    // Upper = 12 + 2 * 1.63299 = 15.2659
    // Lower = 12 - 2 * 1.63299 = 8.734
    
    const bb = result[2];
    expect(bb).toBeDefined();
    expect(bb?.middle).toBe(12);
    expect(bb?.upper).toBeCloseTo(15.266, 2);
    expect(bb?.lower).toBeCloseTo(8.734, 2);
  });
});
