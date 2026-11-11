/**
 * Locates dependency declarations within a pyproject.toml file.
 * @file
 */
import { readFile } from 'node:fs/promises';
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
   * @returns A promise of the 1-based position of the declaration, or null when the file
   * cannot be read or the dependency is not declared.
   * @example
   * const position = await new PyprojectTomlDeducer().findDependencyPosition(
   *   '/workspace/app/pyproject.toml',
   *   'requests',
   * );
   */
  public async findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Promise<Position | null> {
    try {
      const content: string = await readFile(manifestPath, 'utf8');
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
