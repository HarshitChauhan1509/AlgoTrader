import { LiveEvaluationContext } from './evaluation-context';
import { Candle } from '@stock-platform/types';

describe('LiveEvaluationContext', () => {
  it('correctly calculates indicators from candle buffer', () => {
    // Generate dummy candles
    const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
      symbol: 'RELIANCE',
      timeframe: '15m',
      timestamp: new Date(Date.now() + i * 15 * 60000),
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }));

    const ctx = new LiveEvaluationContext(candles);

    // PRICE close for current (offset 0)
    expect(ctx.getValue({ indicator: 'PRICE', field: 'close' })).toBe(149); // The last close is 100 + 49 = 149
    
    // PRICE close for offset 1 (previous)
    expect(ctx.getValue({ indicator: 'PRICE', field: 'close' }, 1)).toBe(148);

    // SMA 14 for current
    // Simple average of 149, 148, ... down to 149 - 13
    const expectedSma = Array.from({length: 14}, (_, i) => 149 - i).reduce((a, b) => a + b, 0) / 14;
    expect(ctx.getValue({ indicator: 'SMA', period: 14 })).toBeCloseTo(expectedSma);

    // It gracefully handles requests for data when buffer is empty
    const emptyCtx = new LiveEvaluationContext([]);
    expect(emptyCtx.getValue({ indicator: 'PRICE' })).toBeNull();
  });
});
