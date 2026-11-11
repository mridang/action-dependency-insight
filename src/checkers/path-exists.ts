/**
 * Asynchronous file existence check shared by the checkers.
 * @file
 */
import { access } from 'node:fs/promises';

/**
 * Tells whether a file or directory exists, treating every access error as absent.
 * @param target - The path to check.
 * @returns A promise of true when the path can be accessed, false otherwise.
 * @example
 * const present = await pathExists('/workspace/app/package.json');
 */
export async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
