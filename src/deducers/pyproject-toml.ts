/**
 * Locates dependency declarations within a pyproject.toml file.
 * @file
 */
import { readFileSync } from 'node:fs';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a pyproject.toml file.
 */
export class PyprojectTomlDeducer implements IPositionDeducer {
  /**
   * Finds the line where a dependency is declared in a pyproject.toml file.
   * The column is always reported as the first column because TOML keys are
   * matched by their line prefix.
   * @param manifestPath - The full path to the pyproject.toml file.
   * @param dependencyName - The name of the dependency to find.
   * @returns The 1-based position of the declaration, or null when the file
   * cannot be read or the dependency is not declared.
   * @example
   * const position = new PyprojectTomlDeducer().findDependencyPosition(
   *   '/workspace/app/pyproject.toml',
   *   'requests',
   * );
   */
  public findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null {
    try {
      // eslint-disable-next-line n/no-sync -- the checker contract is synchronous, so the manifest read stays synchronous
      const content: string = readFileSync(manifestPath, 'utf8');
      const lines: string[] = content.split('\n');

      for (const [i, rawLine] of lines.entries()) {
        const line: string = rawLine.trim();
        if (
          line.startsWith(dependencyName) ||
          line.startsWith(`"${dependencyName}"`)
        ) {
          return { line: i + 1, column: 1 };
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
