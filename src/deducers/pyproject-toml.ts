import * as fs from 'node:fs';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a pyproject.toml file.
 */
export class PyprojectTomlDeducer implements IPositionDeducer {
  public findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null {
    try {
      const content: string = fs.readFileSync(manifestPath, 'utf8');
      const lines: string[] = content.split('\n');

      for (const [i, line_] of lines.entries()) {
        const line: string = line_.trim();
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
