/**
 * Locates dependency declarations within a composer.json file.
 * @file
 */
import { readFile } from 'node:fs/promises';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a composer.json file.
 */
export class ComposerJsonDeducer implements IPositionDeducer {
  /**
   * Finds the line and column where a dependency is declared in a
   * composer.json file.
   * @param manifestPath - The full path to the composer.json file.
   * @param dependencyName - The Packagist name of the dependency to find.
   * @returns A promise of the 1-based position of the declaration, or null when the file
   * cannot be read or the dependency is not declared.
   * @example
   * const position = await new ComposerJsonDeducer().findDependencyPosition(
   *   '/workspace/app/composer.json',
   *   'guzzlehttp/guzzle',
   * );
   */
  public async findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Promise<Position | null> {
    try {
      const content: string = await readFile(manifestPath, 'utf8');
      const lines: string[] = content.split('\n');

      for (const [i, line] of lines.entries()) {
        // Look for keys like "vendor/package-name": "version"
        const regex: RegExp = new RegExp(
          String.raw`^\s*"${dependencyName}"\s*:`,
        );
        if (regex.test(line)) {
          return {
            line: i + 1,
            column: line.indexOf(`"${dependencyName}"`) + 1,
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
