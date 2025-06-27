import * as fs from 'fs';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Finds dependency positions specifically within a pom.xml file.
 */
export class PomXmlDeducer implements IPositionDeducer {
  public findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null {
    try {
      const content: string = fs.readFileSync(manifestPath, 'utf-8');
      const [groupId, artifactId] = dependencyName.split(':');
      const lines: string[] = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<dependency>')) {
          let blockLines = [];
          for (
            let j = i;
            j < lines.length && !lines[j].includes('</dependency>');
            j++
          ) {
            blockLines.push(lines[j]);
          }
          const hasGroupId = blockLines.some((line) =>
            line.includes(`<groupId>${groupId}</groupId>`),
          );
          const hasArtifactId = blockLines.some((line) =>
            line.includes(`<artifactId>${artifactId}</artifactId>`),
          );

          if (hasGroupId && hasArtifactId) {
            return {
              line: i + 1,
              column: lines[i].indexOf('<dependency>') + 1,
            };
          }
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
