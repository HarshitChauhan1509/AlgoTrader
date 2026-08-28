import { sma } from './sma';

describe('SMA Indicator', () => {
  it('calculates correct SMA values', () => {
    const data = [10, 20, 30, 40, 50, 60, 70];
    const result = sma(data, 3);
    
    expect(result).toEqual([
      null,
      null,
      20, // (10+20+30)/3
      30, // (20+30+40)/3
      40, // (30+40+50)/3
      50, // (40+50+60)/3
      60, // (50+60+70)/3
    ]);
  });

  it('handles data length less than period', () => {
    const result = sma([10, 20], 3);
    expect(result).toEqual([null, null]);
  });

  it('throws on invalid period', () => {
    expect(() => sma([10, 20], 0)).toThrow('Period must be greater than 0');
  });
});
