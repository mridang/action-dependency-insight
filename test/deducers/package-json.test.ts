import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as assert from 'assert';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { PackageJsonDeducer } from '../../src/deducers/package-json.js';
import { Position } from '../../src/types.js';

describe('PackageJsonDeducer', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deducer-pkgjson-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in devDependencies section', () => {
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
    fs.writeFileSync(filePath, content);

    const deducer = new PackageJsonDeducer();
    const position: Position | null = deducer.findDependencyPosition(
      filePath,
      'jest',
    );
    assert.deepStrictEqual(position, { line: 7, column: 5 });
  });

  test('should return null if file does not exist', () => {
    const deducer = new PackageJsonDeducer();
    const position = deducer.findDependencyPosition(
      '/non/existent/path/package.json',
      'jest',
    );
    assert.strictEqual(position, null);
  });
});
