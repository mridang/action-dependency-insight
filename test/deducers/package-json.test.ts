/**
 * Tests for the PackageJsonDeducer, using temporary manifest files.
 * @file
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { PackageJsonDeducer } from '../../src/deducers/package-json.js';
import { Position } from '../../src/types.js';

describe('PackageJsonDeducer', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'deducer-pkgjson-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in devDependencies section', async () => {
    const content = JSON.stringify(
      {
        name: 'test-project',
        dependencies: {
          express: '^4.17.1',
        },
        devDependencies: {
          jest: '^27.0.0',
        },
      },
      null,
      2,
    );
    const filePath = path.join(tempDir, 'package.json');
    await writeFile(filePath, content);

    const deducer = new PackageJsonDeducer();
    const position: Position | null = deducer.findDependencyPosition(
      filePath,
      'jest',
    );
    assert.deepStrictEqual(position, { line: 7, column: 5 });
  });

  test('should return null if file does not exist', async () => {
    const deducer = new PackageJsonDeducer();
    const position = deducer.findDependencyPosition(
      '/non/existent/path/package.json',
      'jest',
    );
    assert.strictEqual(position, null);
  });
});
