import { z } from 'zod';

export const IndicatorReferenceSchema = z.object({
  indicator: z.enum(['SMA', 'EMA', 'RSI', 'MACD', 'ATR', 'VWAP', 'PRICE', 'VOLUME']),
  period: z.number().positive().optional(),
  multiplier: z.number().positive().optional(),
  field: z.string().optional(), // e.g., 'close', 'high', 'macd', 'signal'
});

export type IndicatorReference = z.infer<typeof IndicatorReferenceSchema>;

export const StrategyConditionSchema = z.object({
  indicator: z.string(), // e.g., 'PRICE', 'VOLUME', 'EMA', 'RSI'
  field: z.string().optional(),
  period: z.number().positive().optional(),
  operator: z.enum(['>', '<', '>=', '<=', '==', 'CROSS_ABOVE', 'CROSS_BELOW']),
  reference: z.union([IndicatorReferenceSchema, z.string(), z.number()]).optional(),
  value: z.number().optional(),
}).refine(data => data.reference !== undefined || data.value !== undefined, {
  message: "Either 'reference' or 'value' must be provided.",
});

export type StrategyCondition = z.infer<typeof StrategyConditionSchema>;

export const StrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  timeframe: z.string(), // e.g., '15m'
  conditions: z.array(StrategyConditionSchema).min(1),
  action: z.enum(['BUY', 'SELL']),
});

export type Strategy = z.infer<typeof StrategySchema>;

// Context needed to evaluate a strategy.
// The pattern engine provides this context.
export interface EvaluationContext {
  /**
   * Retrieves a numeric value for a given indicator/price reference.
   * `offset` is how many candles back to look (0 = current, 1 = previous, etc.).
   */
  getValue(ref: StrategyCondition | IndicatorReference, offset?: number): number | null;
}

export interface ConditionResult {
  condition: StrategyCondition;
  passed: boolean;
  leftValue: number | null;
  rightValue: number | null;
  reason: string;
}

export interface EvaluationResult {
  strategyId: string;
  matched: boolean;
  action: 'BUY' | 'SELL';
  conditions: ConditionResult[];
}
