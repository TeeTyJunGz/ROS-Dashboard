/**
 * Extract nested values from objects using dot notation
 * Examples:
 *   getNestedValue({a: {b: {c: 5}}}, 'a.b.c') → 5
 *   getNestedValue({data: 42}, 'data') → 42
 *   getNestedValue({x: 1, y: 2}, 'x') → 1
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return null

  const keys = path.split('.')
  let value = obj

  for (const key of keys) {
    if (value === null || value === undefined) {
      return null
    }
    value = value[key]
  }

  return value
}

/**
 * Parse numeric value from various data types
 */
export function parseNumericValue(value) {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Extract numeric value from nested path
 */
export function extractValue(data, path) {
  const value = getNestedValue(data, path)
  return parseNumericValue(value)
}
