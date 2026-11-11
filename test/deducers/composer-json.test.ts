/**
 * Tests for the ComposerJsonDeducer, using temporary manifest files.
 * @file
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { ComposerJsonDeducer } from '../../src/deducers/composer-json.js';
import { Position } from '../../src/types.js';

describe('ComposerJsonDeducer', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'deducer-composer-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in require section', async () => {
    const content = JSON.stringify(
      {
        require: {
          php: '^8.1',
          'league/flysystem': '^3.0',
        },
      },
      null,
      2,
    );
    const filePath = path.join(tempDir, 'composer.json');
    await writeFile(filePath, content);

    const deducer = new ComposerJsonDeducer();
    const position: Position | null = await deducer.findDependencyPosition(
      filePath,
      'league/flysystem',
    );
    assert.deepStrictEqual(position, { line: 4, column: 5 });
  });

  test('should return null for missing dependency', async () => {
    const content = JSON.stringify({ require: { php: '^8.1' } });
    const filePath = path.join(tempDir, 'composer.json');
    await writeFile(filePath, content);

    const deducer = new ComposerJsonDeducer();
    const position = await deducer.findDependencyPosition(
      filePath,
      'monolog/monolog',
    );
    assert.strictEqual(position, null);
  });
});
