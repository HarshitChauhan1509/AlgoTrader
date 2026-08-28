import { createEmptyArray } from './utils';
import { sma } from './sma';

/**
 * Calculates the Exponential Moving Average (EMA).
 *
 * @param data Array of numbers
 * @param period The smoothing period (e.g., 20)
 */
export function ema(data: number[], period: number): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  if (data.length < period) {
    return createEmptyArray(data.length);
  }

  const result: (number | null)[] = createEmptyArray(period - 1);
  const k = 2 / (period + 1);

  // First value is an SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i] as number;
  }
  let prevEma = sum / period;
  result.push(prevEma);

  // Subsequent values
  for (let i = period; i < data.length; i++) {
    const currentPrice = data[i] as number;
    const currentEma = currentPrice * k + prevEma * (1 - k);
    result.push(currentEma);
    prevEma = currentEma;
  }

  return result;
}
