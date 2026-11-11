/**
 * Global Jest teardown for the test suite.
 * @file
 */

/**
 * Runs once after the whole test suite. The suite starts no external services,
 * so there is nothing to stop.
 * @returns A promise that resolves immediately.
 * @example
 * await teardown();
 */
export default async function teardown(): Promise<void> {
  // No external services to tear down.
}
