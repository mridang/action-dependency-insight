/**
 * Type guards for the JSON reports that the wrapped tools print.
 * @file
 */

/**
 * Tests one property of a parsed JSON value without assuming its shape.
 * @param value - The parsed JSON value.
 * @param key - The property to test.
 * @param test - Receives the property value, or `undefined` when it is absent.
 * @returns True when the value is an object whose property passes the test.
 * @example
 * hasProperty({ a: 'x' }, 'a', isString); // true
 */
export function hasProperty(
  value: unknown,
  key: string,
  test: (candidate: unknown) => boolean,
): boolean {
  return (
    value instanceof Object && test(new Map(Object.entries(value)).get(key))
  );
}

/**
 * Tells whether a parsed JSON value is a string.
 * @param value - The parsed JSON value.
 * @returns True for a string.
 * @example
 * isString('a'); // true
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Tells whether a parsed JSON value is a list whose items all pass a guard.
 * @param value - The parsed JSON value.
 * @param isItem - The guard every item must pass.
 * @returns True for a list of matching items.
 * @example
 * isListOf(['a'], isString); // true
 */
export function isListOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(isItem);
}

/**
 * Tells whether a parsed JSON value is absent or a list of matching items.
 * @param value - The parsed JSON value.
 * @param isItem - The guard every item must pass.
 * @returns True when the value is `undefined` or a list of matching items.
 * @example
 * isOptionalListOf(undefined, isString); // true
 */
export function isOptionalListOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] | undefined {
  return value === undefined || isListOf(value, isItem);
}
