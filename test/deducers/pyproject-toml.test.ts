import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as assert from 'assert';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { PyprojectTomlDeducer } from '../../src/deducers/pyproject-toml.js';
import { Position } from '../../src/types.js';

describe('PyprojectTomlDeducer', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deducer-toml-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in dependencies section', () => {
    const content = [
      '[tool.poetry.dependencies]',
      'requests = "^2.25.1"',
      '[tool.poetry.dev-dependencies]',
      'pytest = "^6.2.2"',
    ].join('\n');
    const filePath = path.join(tempDir, 'pyproject.toml');
    fs.writeFileSync(filePath, content);

    const deducer = new PyprojectTomlDeducer();
    const position: Position | null = deducer.findDependencyPosition(
      filePath,
      'requests',
    );
    assert.deepStrictEqual(position, { line: 2, column: 1 });
  });

  test('should find dependency with quotes', () => {
    const content = `[tool.poetry.dependencies]\n"my-package" = { version = "^1.0", python = "^3.9" }`;
    const filePath = path.join(tempDir, 'pyproject.toml');
    fs.writeFileSync(filePath, content);

    const deducer = new PyprojectTomlDeducer();
    const position = deducer.findDependencyPosition(filePath, 'my-package');
    assert.deepStrictEqual(position, { line: 2, column: 1 });
  });
});
