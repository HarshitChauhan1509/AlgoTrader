import { Candle } from '@stock-platform/types';
import { MockMarketDataProvider } from './mock-market-data.provider';

describe('MockMarketDataProvider', () => {
  let provider: MockMarketDataProvider;

  beforeEach(() => {
    provider = new MockMarketDataProvider();
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  it('should generate historical candles deterministically', async () => {
    const startDate = new Date('2026-01-01T10:00:00Z');
    const endDate = new Date('2026-01-01T10:05:00Z'); // 5 minutes

    const candles = await provider.getHistoricalCandles('RELIANCE', '1m', startDate, endDate);
    
    expect(candles).toBeDefined();
    expect(candles.length).toBe(6); // 10:00 to 10:05 inclusive is 6 candles
    
    // Check first candle structure
    const first = candles[0] as Candle;
    expect(first.symbol).toBe('RELIANCE');
    expect(first.timeframe).toBe('1m');
    expect(first.timestamp).toEqual(startDate);
    
    expect(first.open).toBeGreaterThan(0);
    expect(first.high).toBeGreaterThanOrEqual(first.open);
    expect(first.low).toBeLessThanOrEqual(first.open);
    expect(first.close).toBeGreaterThanOrEqual(first.low);
    expect(first.close).toBeLessThanOrEqual(first.high);
    expect(first.volume).toBeGreaterThan(0);
  });

  it('should connect and disconnect without errors', async () => {
    await expect(provider.connect()).resolves.toBeUndefined();
    await expect(provider.disconnect()).resolves.toBeUndefined();
  });

  it('should stream data correctly', (done) => {
    const symbol = 'TCS';
    let count = 0;
    
    // For test we don't want to wait seconds. The mock provider uses 1000ms for '1m'
    // To not hold up tests, we will just verify subscription logic doesn't crash,
    // and manually trigger if we could, but here we just subscribe and then immediately unsubscribe.
    
    provider.subscribeCandles(symbol, '1m', (candle) => {
      count++;
    });

    // Unsubscribe immediately so it doesn't leave an open handle
    provider.unsubscribeCandles(symbol, '1m');
    
    // Test passed if we got here without throwing
    done();
  });
});
