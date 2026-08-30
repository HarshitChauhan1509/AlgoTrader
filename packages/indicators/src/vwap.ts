import { Candle } from '@stock-platform/types';

/**
 * Calculates the Volume Weighted Average Price (VWAP).
 * This calculates a cumulative VWAP over the provided array of candles.
 * For daily VWAP, provide an array containing only the current day's candles.
 */
export function vwap(candles: Candle[]): number[] {
  const result: number[] = [];
  
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    
    cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    if (cumulativeVolume === 0) {
      result.push(typicalPrice); // Fallback if volume is 0
    } else {
      result.push(cumulativeTypicalPriceVolume / cumulativeVolume);
    }
  }

  return result;
}
