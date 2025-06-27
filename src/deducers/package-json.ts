import * as fs from 'fs';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a package.json file.
 */
export class PackageJsonDeducer implements IPositionDeducer {
  // noinspection DuplicatedCode
  public findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null {
    try {
      const content: string = fs.readFileSync(manifestPath, 'utf-8');
      const lines: string[] = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line: string = lines[i];
        // Look for keys like "package-name": "version"
        const regex: RegExp = new RegExp(`^\\s*"${dependencyName}"\\s*:`);
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
