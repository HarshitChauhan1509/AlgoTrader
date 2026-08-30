import { createEmptyArray } from './utils';

/**
 * Calculates the Relative Strength Index (RSI).
 *
 * @param data Array of price data
 * @param period The lookback period (usually 14)
 */
export function rsi(data: number[], period: number = 14): (number | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  // RSI needs at least period + 1 data points (for the initial period differences)
  if (data.length <= period) {
    return createEmptyArray(data.length);
  }

  const result: (number | null)[] = createEmptyArray(period);
  
  let sumGain = 0;
  let sumLoss = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = (data[i] as number) - (data[i - 1] as number);
    if (diff >= 0) {
      sumGain += diff;
    } else {
      sumLoss += Math.abs(diff);
    }
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  const calculateRsi = (ag: number, al: number): number => {
    if (al === 0) return 100;
    const rs = ag / al;
    return 100 - (100 / (1 + rs));
  };

  result.push(calculateRsi(avgGain, avgLoss));

  // Subsequent values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const diff = (data[i] as number) - (data[i - 1] as number);
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result.push(calculateRsi(avgGain, avgLoss));
  }

  return result;
}
