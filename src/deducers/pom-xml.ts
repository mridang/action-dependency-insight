/**
 * Locates dependency declarations within a pom.xml file.
 * @file
 */
import { readFileSync } from 'node:fs';
import { IPositionDeducer } from '../interfaces.js';
import { Position } from '../types.js';

/**
 * Collects the lines of a Maven `<dependency>` block, starting at the given
 * line and stopping before the closing tag.
 * @param lines - All lines of the pom.xml file.
 * @param start - The index of the line that opens the block.
 * @returns The lines making up the block, excluding the closing tag.
 * @example
 * const block = collectBlockLines(['<dependency>', '</dependency>'], 0);
 */
function collectBlockLines(lines: string[], start: number): string[] {
  const blockLines: string[] = [];
  for (
    let j = start;
    j < lines.length && !lines[j].includes('</dependency>');
    j++
  ) {
    blockLines.push(lines[j]);
  }
  return blockLines;
}

/**
 * Scans the lines of a pom.xml file for a `<dependency>` block whose group
 * and artifact identifiers match the requested coordinates.
 * @param lines - All lines of the pom.xml file.
 * @param groupId - The Maven group identifier to match.
 * @param artifactId - The Maven artifact identifier to match.
 * @returns The 1-based position of the matching block, or null if none match.
 * @example
 * const position = findDeclaration(lines, 'org.example', 'demo');
 */
function findDeclaration(
  lines: string[],
  groupId: string,
  artifactId: string,
): Position | null {
  for (const [i, line] of lines.entries()) {
    if (line.includes('<dependency>')) {
      const blockLines = collectBlockLines(lines, i);
      const hasGroupId = blockLines.some((blockLine) =>
        blockLine.includes(`<groupId>${groupId}</groupId>`),
      );
      const hasArtifactId = blockLines.some((blockLine) =>
        blockLine.includes(`<artifactId>${artifactId}</artifactId>`),
      );

      if (hasGroupId && hasArtifactId) {
        return {
          line: i + 1,
          column: line.indexOf('<dependency>') + 1,
        };
      }
    }
  }
  return null;
}

/**
 * Finds dependency positions specifically within a pom.xml file.
 */
export class PomXmlDeducer implements IPositionDeducer {
  /**
   * Finds the line and column where a Maven dependency is declared.
   * @param manifestPath - The full path to the pom.xml file.
   * @param dependencyName - The coordinates as `groupId:artifactId`.
   * @returns The 1-based position of the `<dependency>` tag, or null when the
   * file cannot be read or the dependency is not declared.
   * @example
   * const position = new PomXmlDeducer().findDependencyPosition(
   *   '/workspace/app/pom.xml',
   *   'org.apache.commons:commons-lang3',
   * );
   */
  public findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null {
    try {
      // eslint-disable-next-line n/no-sync -- the checker contract is synchronous, so the manifest read stays synchronous
      const content: string = readFileSync(manifestPath, 'utf8');
      const [groupId, artifactId] = dependencyName.split(':');
      const lines: string[] = content.split('\n');

      return findDeclaration(lines, groupId, artifactId);
    } catch {
      return null;
    }
  }
}
