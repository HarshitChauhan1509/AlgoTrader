/**
 * Creates an array of the exact same length as the input,
 * filled with nulls. Used for padding the start of indicator results.
 */
export function createEmptyArray(length: number): null[] {
  return Array(length).fill(null);
}

/**
 * Extracts a specific field from an array of objects (like Candles).
 */
export function extractField<T, K extends keyof T>(data: T[], field: K): number[] {
  return data.map((item) => Number(item[field]));
}
