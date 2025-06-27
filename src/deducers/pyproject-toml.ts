import * as fs from 'fs';
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
      const content: string = fs.readFileSync(manifestPath, 'utf-8');
      const lines: string[] = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line: string = lines[i].trim();
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
