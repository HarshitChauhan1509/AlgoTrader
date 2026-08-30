import { ema } from './ema';

describe('EMA Indicator', () => {
  it('calculates correct EMA values', () => {
    // Basic dataset
    const data = [10, 20, 30, 40, 50, 60, 70];
    const result = ema(data, 3);
    
    // k = 2 / (3 + 1) = 0.5
    // Initial SMA for first 3 = (10+20+30)/3 = 20
    // Next: 40 * 0.5 + 20 * 0.5 = 30
    // Next: 50 * 0.5 + 30 * 0.5 = 40
    
    expect(result).toEqual([
      null,
      null,
      20,
      30,
      40,
      50,
      60,
    ]);
  });
});
