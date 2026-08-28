import { createEmptyArray } from './utils';

/**
 * Calculates the Simple Moving Average (SMA) for a given dataset and period.
 *
 * @param data Array of numbers
 * @param period The smoothing period (e.g., 20)
 * @returns An array of the same length as `data`, where the first `period - 1` elements are `null`.
 */
export function sma(data: number[], period: number): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  if (data.length < period) {
    return createEmptyArray(data.length);
  }

  const result: (number | null)[] = createEmptyArray(period - 1);
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i] as number;
  }
  
  result.push(sum / period);

  for (let i = period; i < data.length; i++) {
    sum += (data[i] as number) - (data[i - period] as number);
    result.push(sum / period);
  }

  return result;
}
