/**
 * Builds fresh GitHub contexts for the action.
 * @file
 */
import { context } from '@actions/github';

/**
 * Tells whether a value is an instance of the GitHub context class.
 * @param value - The value to check.
 * @returns True when the value was built by the context class.
 * @example
 * isContext(context); // true
 */
function isContext(value: unknown): value is typeof context {
  return value instanceof context.constructor;
}

/**
 * Builds a fresh GitHub context, which re-reads the workflow environment.
 * @returns A new context.
 * @example
 * const fresh = createContext();
 */
export function createContext(): typeof context {
  const created: unknown = Reflect.construct(context.constructor, []);
  if (!isContext(created)) {
    throw new TypeError('Could not create the GitHub context.');
  }
  return created;
}
