import { createEmptyArray } from './utils';
import { sma } from './sma';

export interface BollingerBandsOutput {
  upper: number;
  middle: number; // This is the SMA
  lower: number;
}

/**
 * Calculates Bollinger Bands.
 */
export function bollingerBands(
  data: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): (BollingerBandsOutput | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  if (data.length < period) {
    return createEmptyArray(data.length);
  }

  const smaValues = sma(data, period);
  const result: (BollingerBandsOutput | null)[] = createEmptyArray(data.length);

  for (let i = period - 1; i < data.length; i++) {
    const currentSma = smaValues[i];
    if (currentSma === null) continue;

    // Calculate variance
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const price = data[i - j] as number;
      sumSquaredDiff += Math.pow(price - currentSma, 2);
    }
    
    // Sample variance (period) or population (period-1). Usually standard BB uses population (period).
    const variance = sumSquaredDiff / period;
    const stdDev = Math.sqrt(variance);

    result[i] = {
      middle: currentSma,
      upper: currentSma + (stdDev * stdDevMultiplier),
      lower: currentSma - (stdDev * stdDevMultiplier),
    };
  }

  return result;
}
