import * as path from 'path';
import * as assert from 'assert';
import { execSync } from 'child_process';
import { describe, test } from '@jest/globals';
import { ComposerUnusedChecker } from '../../src/checkers/composer.js';
import { ComposerJsonDeducer } from '../../src/deducers/composer-json.js';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';

describe('ComposerUnusedChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/composer');
  const imageName = 'composer-checker-test';

  const dockerRunFn = (): string => {
    execSync(
      `docker build --tag=${imageName} --file=${projectPath}/Dockerfile ${projectPath}`,
      { stdio: 'inherit' },
    );
    return execSync(`docker run --rm ${imageName}`, { encoding: 'utf-8' });
  };

  test('should throw an error if command is not found', () => {
    const errorRunFn = () => {
      const err = new Error('Command failed');
      // @ts-expect-error since this is a test
      (err as never).stderr = 'command not found';
      throw err;
    };
    const checker = new ComposerUnusedChecker(errorRunFn);
    const deducer = new ComposerJsonDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
    };
    const checker = new ComposerUnusedChecker(errorRunFn);
    const deducer = new ComposerJsonDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should identify unused PHP dependencies', () => {
    const checker = new ComposerUnusedChecker(dockerRunFn);
    const deducer = new ComposerJsonDeducer();

    const results: AnalysisResult[] = checker.run(projectPath, deducer);

    assert.deepEqual(results, [
      {
        status: 'UNUSED',
        category: 'unknown',
        dependency: { name: 'guzzlehttp/guzzle' },
        sourceFile: 'composer.json',
        position: { line: 5, column: 5 },
      },
      {
        status: 'UNUSED',
        category: 'unknown',
        dependency: { name: 'nesbot/carbon' },
        sourceFile: 'composer.json',
        position: { line: 6, column: 5 },
      },
    ]);
  });
});
