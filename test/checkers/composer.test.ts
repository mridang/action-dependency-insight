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
    const checker = new ComposerUnusedChecker(
      new ComposerJsonDeducer(),
      errorRunFn,
    );
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
    };
    const checker = new ComposerUnusedChecker(
      new ComposerJsonDeducer(),
      errorRunFn,
    );
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should identify unused PHP dependencies', () => {
    const checker = new ComposerUnusedChecker(
      new ComposerJsonDeducer(),
      dockerRunFn,
    );

    const results: { checkResult: AnalysisResult[]; helpText: string } =
      checker.run(projectPath, true);

    assert.deepEqual(results.checkResult, [
      {
        status: 'UNUSED',
        category: 'unknown',
        dependency: { name: 'guzzlehttp/guzzle' },
        sourceFile: 'composer.json',
        position: { line: 5, column: 5 },
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/packagist.svg',
          ),
          link: new URL('https://packagist.org/packages/guzzlehttp/guzzle'),
        },
      },
      {
        status: 'UNUSED',
        category: 'unknown',
        dependency: { name: 'nesbot/carbon' },
        sourceFile: 'composer.json',
        position: { line: 6, column: 5 },
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/packagist.svg',
          ),
          link: new URL('https://packagist.org/packages/nesbot/carbon'),
        },
      },
    ]);
  });
});
