import { Candle } from '@stock-platform/types';
import { createEmptyArray } from './utils';

/**
 * Calculates the Average True Range (ATR).
 */
export function atr(candles: Candle[], period: number = 14): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  if (candles.length <= period) {
    return createEmptyArray(candles.length);
  }

  const result: (number | null)[] = createEmptyArray(period);
  const trueRanges: number[] = [];

  // TR for first candle is just High - Low
  trueRanges.push((candles[0] as Candle).high - (candles[0] as Candle).low);

  for (let i = 1; i < candles.length; i++) {
    const currentHigh = (candles[i] as Candle).high;
    const currentLow = (candles[i] as Candle).low;
    const prevClose = (candles[i - 1] as Candle).close;

    const tr1 = currentHigh - currentLow;
    const tr2 = Math.abs(currentHigh - prevClose);
    const tr3 = Math.abs(currentLow - prevClose);

    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  // First ATR is the simple average of the first 'period' True Ranges
  let initialTrSum = 0;
  for (let i = 1; i <= period; i++) {
    initialTrSum += (trueRanges[i] as number);
  }
  
  let currentAtr = initialTrSum / period;
  result.push(currentAtr);

  // Subsequent ATRs use Wilder's smoothing
  for (let i = period + 1; i < candles.length; i++) {
    currentAtr = (currentAtr * (period - 1) + (trueRanges[i] as number)) / period;
    result.push(currentAtr);
  }

  return result;
}

