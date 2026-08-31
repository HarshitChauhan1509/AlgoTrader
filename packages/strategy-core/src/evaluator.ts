import {
  ConditionResult,
  EvaluationContext,
  EvaluationResult,
  IndicatorReference,
  Strategy,
  StrategyCondition,
} from './types';

/**
 * Parses a string reference like "PREVIOUS_20_HIGH" into an offset and a field.
 * In a real-world scenario, this might be handled by the context or a dedicated parser.
 */
function parseStringReference(ref: string): { offset: number; field?: string } | null {
  const match = ref.match(/^PREVIOUS_(\d+)_?(.*)?$/);
  if (match) {
    const offsetStr = match[1] as string;
    const result: { offset: number; field?: string } = { offset: parseInt(offsetStr, 10) };
    if (match[2]) result.field = match[2].toLowerCase();
    return result;
  }
  return null;
}

/**
 * Safely evaluates a strategy against the provided market context.
 * Does NOT use eval() or arbitrary javascript execution.
 */
export class StrategyEvaluator {
  public evaluate(strategy: Strategy, context: EvaluationContext): EvaluationResult {
    const conditionResults: ConditionResult[] = [];
    let allMatched = true;

    for (const condition of strategy.conditions) {
      const result = this.evaluateCondition(condition, context);
      conditionResults.push(result);
      if (!result.passed) {
        allMatched = false;
        // Depending on design, we could break early, but evaluating all gives a complete explanation.
      }
    }

    return {
      strategyId: strategy.id,
      matched: allMatched,
      action: strategy.action,
      conditions: conditionResults,
    };
  }

  private evaluateCondition(condition: StrategyCondition, context: EvaluationContext): ConditionResult {
    // 1. Get Left Value (Current Indicator/Price)
    const leftValue = context.getValue(condition);

    // 2. Get Right Value (Reference or Value)
    let rightValue: number | null = null;
    let rightOffset = 0;

    if (condition.value !== undefined) {
      rightValue = condition.value;
    } else if (typeof condition.reference === 'number') {
      rightValue = condition.reference;
    } else if (typeof condition.reference === 'string') {
      // e.g., "PREVIOUS_20_HIGH"
      const parsed = parseStringReference(condition.reference);
      if (parsed) {
        rightOffset = parsed.offset;
        // In string references like PREVIOUS_20_HIGH, the indicator is usually PRICE implicitly
        rightValue = context.getValue(
          { indicator: 'PRICE', field: parsed.field },
          rightOffset
        );
      }
    } else if (typeof condition.reference === 'object') {
      // It's an IndicatorReference
      const ref = condition.reference as IndicatorReference;
      rightValue = context.getValue(ref);
      if (rightValue !== null && ref.multiplier !== undefined) {
        rightValue *= ref.multiplier;
      }
    }

    // 3. Evaluate Operator safely
    let passed = false;
    let reason = '';

    if (leftValue === null || rightValue === null) {
      reason = 'Insufficient data for evaluation';
    } else {
      switch (condition.operator) {
        case '>':
          passed = leftValue > rightValue;
          break;
        case '<':
          passed = leftValue < rightValue;
          break;
        case '>=':
          passed = leftValue >= rightValue;
          break;
        case '<=':
          passed = leftValue <= rightValue;
          break;
        case '==':
          // Using a small epsilon for floating point comparison might be necessary, 
          // but strictly speaking:
          passed = leftValue === rightValue;
          break;
        case 'CROSS_ABOVE':
        case 'CROSS_BELOW':
          // Cross logic requires looking at the previous tick
          const prevLeft = context.getValue(condition, 1);
          
          let prevRight: number | null = null;
          if (condition.value !== undefined || typeof condition.reference === 'number') {
             prevRight = rightValue; // Constant threshold
          } else if (typeof condition.reference === 'string') {
             const parsed = parseStringReference(condition.reference);
             if (parsed) {
               prevRight = context.getValue({ indicator: 'PRICE', field: parsed.field }, parsed.offset + 1);
             }
          } else if (typeof condition.reference === 'object') {
             const pRef = condition.reference as IndicatorReference;
             prevRight = context.getValue(pRef, 1);
             if (prevRight !== null && pRef.multiplier !== undefined) {
               prevRight *= pRef.multiplier;
             }
          }

          if (prevLeft === null || prevRight === null) {
            reason = 'Insufficient historical data for CROSS evaluation';
            passed = false;
          } else {
            if (condition.operator === 'CROSS_ABOVE') {
              passed = prevLeft <= prevRight && leftValue > rightValue;
            } else {
              passed = prevLeft >= prevRight && leftValue < rightValue;
            }
          }
          break;
        default:
          reason = `Unknown operator: ${condition.operator}`;
      }
    }

    if (!reason) {
      reason = passed ? 'PASS' : 'FAIL';
    }

    return {
      condition,
      passed,
      leftValue,
      rightValue,
      reason,
    };
  }
}



