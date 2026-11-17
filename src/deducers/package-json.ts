/**
 * Locates dependency declarations within a package.json file.
 * @file
 */
import { readFile } from 'node:fs/promises';
import type { IPositionDeducer } from '../interfaces.js';
import type { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a package.json file.
 */
export class PackageJsonDeducer implements IPositionDeducer {
  /**
   * Finds the line and column where a dependency is declared in a
   * package.json file.
   * @param manifestPath - The full path to the package.json file.
   * @param dependencyName - The name of the dependency to find.
   * @returns A promise of the 1-based position of the declaration, or null when the file
   * cannot be read or the dependency is not declared.
   * @example
   * const position = await new PackageJsonDeducer().findDependencyPosition(
   *   '/workspace/app/package.json',
   *   'lodash',
   * );
   */
  public async findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Promise<Position | null> {
    try {
      const content: string = await readFile(manifestPath, 'utf8');
      const lines: string[] = content.split('\n');

      // Look for keys like "package-name": "version"
      const regex = new RegExp(String.raw`^\s*"${dependencyName}"\s*:`, 'u');
      const found = lines
        .map((line, index) => ({ line, index }))
        .find(({ line }) => regex.test(line));
      if (found) {
        return {
          line: found.index + 1,
          column: found.line.indexOf(`"${dependencyName}"`) + 1,
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}
