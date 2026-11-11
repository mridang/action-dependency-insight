/**
 * Tests for the PyprojectTomlDeducer, using temporary manifest files.
 * @file
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { PyprojectTomlDeducer } from '../../src/deducers/pyproject-toml.js';
import { Position } from '../../src/types.js';

describe('PyprojectTomlDeducer', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'deducer-toml-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in dependencies section', async () => {
    const content = [
      '[tool.poetry.dependencies]',
      'requests = "^2.25.1"',
      '[tool.poetry.dev-dependencies]',
      'pytest = "^6.2.2"',
    ].join('\n');
    const filePath = path.join(tempDir, 'pyproject.toml');
    await writeFile(filePath, content);

    const deducer = new PyprojectTomlDeducer();
    const position: Position | null = deducer.findDependencyPosition(
      filePath,
      'requests',
    );
    assert.deepStrictEqual(position, { line: 2, column: 1 });
  });

  test('should find dependency with quotes', async () => {
    const content = `[tool.poetry.dependencies]\n"my-package" = { version = "^1.0", python = "^3.9" }`;
    const filePath = path.join(tempDir, 'pyproject.toml');
    await writeFile(filePath, content);

    const deducer = new PyprojectTomlDeducer();
    const position = deducer.findDependencyPosition(filePath, 'my-package');
    assert.deepStrictEqual(position, { line: 2, column: 1 });
  });
});
