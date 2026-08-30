import { Candle } from '@stock-platform/types';
import { createEmptyArray } from './utils';

export interface ADXOutput {
  adx: number;
  plusDi: number;
  minusDi: number;
}

/**
 * Calculates Average Directional Index (ADX) along with +DI and -DI.
 */
export function adx(candles: Candle[], period: number = 14): (ADXOutput | null)[] {
  if (period <= 0) {
    throw new Error('Period must be greater than 0');
  }

  if (candles.length <= period) {
    return createEmptyArray(candles.length);
  }

  const tr: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];

  // Calculate TR, +DM, -DM
  for (let i = 1; i < candles.length; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const tr1 = currentHigh - currentLow;
    const tr2 = Math.abs(currentHigh - prevClose);
    const tr3 = Math.abs(currentLow - prevClose);
    tr.push(Math.max(tr1, tr2, tr3));

    const upMove = currentHigh - prevHigh;
    const downMove = prevLow - currentLow;

    let pDm = 0;
    let mDm = 0;

    if (upMove > downMove && upMove > 0) {
      pDm = upMove;
    }
    if (downMove > upMove && downMove > 0) {
      mDm = downMove;
    }

    plusDm.push(pDm);
    minusDm.push(mDm);
  }

  const result: (ADXOutput | null)[] = createEmptyArray(candles.length);

  // Initial sum for first period (using simple sum as base for smoothing)
  let smoothedTr = 0;
  let smoothedPlusDm = 0;
  let smoothedMinusDm = 0;

  for (let i = 0; i < period; i++) {
    smoothedTr += tr[i];
    smoothedPlusDm += plusDm[i];
    smoothedMinusDm += minusDm[i];
  }

  const dxValues: number[] = [];

  const calculateDiAndDx = (sTr: number, sPdm: number, sMdm: number) => {
    const pDi = sTr === 0 ? 0 : (sPdm / sTr) * 100;
    const mDi = sTr === 0 ? 0 : (sMdm / sTr) * 100;
    const dx = (pDi + mDi) === 0 ? 0 : (Math.abs(pDi - mDi) / (pDi + mDi)) * 100;
    return { pDi, mDi, dx };
  };

  let initialDiDx = calculateDiAndDx(smoothedTr, smoothedPlusDm, smoothedMinusDm);
  dxValues.push(initialDiDx.dx);
  
  // Note: ADX is a smoothing of DX over `period` days.
  // So the first ADX value requires `period` DX values! 
  // Hence the first ADX value actually appears at `2 * period - 1` data points if we follow Wilder strictly.
  // But standard implementations often start outputting +DI and -DI immediately, leaving ADX null until enough DX exists.
  
  // We'll calculate the rest of TR and DM using Wilder's Smoothing: 
  // Current = Prev - (Prev/Period) + Current
  
  const pDiArray: number[] = createEmptyArray(candles.length) as any;
  const mDiArray: number[] = createEmptyArray(candles.length) as any;
  
  pDiArray[period] = initialDiDx.pDi;
  mDiArray[period] = initialDiDx.mDi;
  
  for (let i = period; i < tr.length; i++) {
    smoothedTr = smoothedTr - (smoothedTr / period) + tr[i];
    smoothedPlusDm = smoothedPlusDm - (smoothedPlusDm / period) + plusDm[i];
    smoothedMinusDm = smoothedMinusDm - (smoothedMinusDm / period) + minusDm[i];

    const vals = calculateDiAndDx(smoothedTr, smoothedPlusDm, smoothedMinusDm);
    dxValues.push(vals.dx);
    pDiArray[i + 1] = vals.pDi;
    mDiArray[i + 1] = vals.mDi;
  }

  // Now smooth DX to get ADX
  if (dxValues.length >= period) {
    let adxSum = 0;
    for (let i = 0; i < period; i++) {
      adxSum += dxValues[i];
    }
    let currentAdx = adxSum / period;
    
    // The first ADX value corresponds to index: period + period - 1 = 2*period - 1 in original candles
    // But index in dxValues is 'period - 1'.
    const adxStartIndex = 2 * period - 1;
    if (adxStartIndex < candles.length) {
      result[adxStartIndex] = {
        adx: currentAdx,
        plusDi: pDiArray[adxStartIndex],
        minusDi: mDiArray[adxStartIndex],
      };
    }

    // Subsequent ADX
    let dxIdx = period;
    for (let i = adxStartIndex + 1; i < candles.length; i++) {
      currentAdx = (currentAdx * (period - 1) + dxValues[dxIdx]) / period;
      result[i] = {
        adx: currentAdx,
        plusDi: pDiArray[i],
        minusDi: mDiArray[i],
      };
      dxIdx++;
    }
  }

  return result;
}
