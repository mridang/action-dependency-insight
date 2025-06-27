import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as assert from 'assert';
import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { ComposerJsonDeducer } from '../../src/deducers/composer-json.js';
import { Position } from '../../src/types.js';

describe('ComposerJsonDeducer', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deducer-composer-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should find dependency in require section', () => {
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
    fs.writeFileSync(filePath, content);

    const deducer = new ComposerJsonDeducer();
    const position: Position | null = deducer.findDependencyPosition(
      filePath,
      'league/flysystem',
    );
    assert.deepStrictEqual(position, { line: 4, column: 5 });
  });

  test('should return null for missing dependency', () => {
    const content = JSON.stringify({ require: { php: '^8.1' } });
    const filePath = path.join(tempDir, 'composer.json');
    fs.writeFileSync(filePath, content);

    const deducer = new ComposerJsonDeducer();
    const position = deducer.findDependencyPosition(
      filePath,
      'monolog/monolog',
    );
    assert.strictEqual(position, null);
  });
});
