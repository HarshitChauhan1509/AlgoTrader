import { createEmptyArray } from './utils';
import { ema } from './ema';

export interface MACDOutput {
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Calculates the Moving Average Convergence Divergence (MACD).
 */
export function macd(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): (MACDOutput | null)[] {
  if (fastPeriod >= slowPeriod) {
    throw new Error('fastPeriod must be less than slowPeriod');
  }

  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);

  const macdLine: (number | null)[] = data.map((_, i) => {
    if (fastEma[i] === null || slowEma[i] === null) return null;
    return (fastEma[i] as number) - (slowEma[i] as number);
  });

  // Calculate signal line which is EMA of MACD line
  // We need to filter out nulls to calculate EMA, then pad it back
  const validMacdValues = macdLine.filter((v): v is number => v !== null);
  const signalEmaValid = ema(validMacdValues, signalPeriod);
  
  const result: (MACDOutput | null)[] = createEmptyArray(data.length);
  
  let validIndex = 0;
  for (let i = 0; i < data.length; i++) {
    const currentMacd = macdLine[i];
    if (currentMacd === null) continue;

    const currentSignal = signalEmaValid[validIndex];
    validIndex++;

    if (currentSignal === null) continue;

    result[i] = {
      macd: currentMacd,
      signal: currentSignal,
      histogram: currentMacd - currentSignal,
    };
  }

  return result;
}
