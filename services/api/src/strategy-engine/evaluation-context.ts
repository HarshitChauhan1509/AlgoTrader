import { EvaluationContext, IndicatorReference, StrategyCondition } from '@stock-platform/strategy-core';
import { Candle } from '@stock-platform/types';
import {
  sma,
  ema,
  rsi,
  macd,
  atr,
  vwap,
  bollingerBands,
  adx,
  extractField,
} from '@stock-platform/indicators';

export class LiveEvaluationContext implements EvaluationContext {
  constructor(private readonly candles: Candle[]) {}

  getValue(ref: StrategyCondition | IndicatorReference, offset: number = 0): number | null {
    if (this.candles.length === 0) return null;
    
    // We want the value at `candles.length - 1 - offset`
    const targetIndex = this.candles.length - 1 - offset;
    if (targetIndex < 0) return null;

    const indicatorName = ref.indicator.toUpperCase();

    if (indicatorName === 'PRICE') {
      const field = (ref.field || 'close') as keyof Candle;
      return Number((this.candles[targetIndex] as Candle)[field]);
    }

    if (indicatorName === 'VOLUME') {
      return (this.candles[targetIndex] as Candle).volume;
    }

    const period = ref.period || 14;
    const closes = extractField(this.candles, 'close');

    let results: (number | null | object)[] = [];

    switch (indicatorName) {
      case 'SMA':
        results = sma(closes, period);
        break;
      case 'EMA':
        results = ema(closes, period);
        break;
      case 'RSI':
        results = rsi(closes, period);
        break;
      case 'MACD':
        // using standard defaults (12, 26, 9) if not provided, though period might not map perfectly. 
        // A robust system would pass full MACD config via ref.
        results = macd(closes, 12, 26, 9);
        break;
      case 'ATR':
        results = atr(this.candles, period);
        break;
      case 'VWAP':
        // For simplicity, running cumulative VWAP on the whole buffer
        results = vwap(this.candles);
        break;
      case 'BOLLINGER':
        results = bollingerBands(closes, period, 2);
        break;
      case 'ADX':
        results = adx(this.candles, period);
        break;
      default:
        return null;
    }

    const result = results[targetIndex];
    if (result === null || result === undefined) return null;

    // Handle complex object returns (MACD, Bollinger, ADX)
    if (typeof result === 'object') {
      const field = ref.field || Object.keys(result)[0];
      const val = (result as any)[field!];
      return val === undefined ? null : Number(val);
    }

    return Number(result);
  }
}

