/**
 * Tests for the KnipChecker, run through a Docker image built from the fixture.
 * @file
 */
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { describe, test } from '@jest/globals';
import { KnipChecker } from '../../src/checkers/knip.js';
import { PackageJsonDeducer } from '../../src/deducers/package-json.js';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';

describe('KnipChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/node');
  const imageName = 'node-checker-test';

  const dockerRunFn = (): string => {
    // eslint-disable-next-line n/no-sync -- the Docker build runs synchronously inside the synchronous checker test
    execSync(
      `docker build --tag=${imageName} --file=${projectPath}/Dockerfile ${projectPath}`,
      { stdio: 'inherit' },
    );
    // eslint-disable-next-line n/no-sync -- the Docker run runs synchronously inside the synchronous checker test
    return execSync(`docker run --rm ${imageName}`, { encoding: 'utf8' });
  };

  test('should throw an error if command is not found', () => {
    const errorRunFn = () => {
      const err = new Error('Command failed');
      // @ts-expect-error since this is a test
      (err as never).stderr = 'command not found';
      throw err;
    };
    const checker = new KnipChecker(new PackageJsonDeducer(), errorRunFn);
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error('Generic failure');
    };
    const checker = new KnipChecker(new PackageJsonDeducer(), errorRunFn);
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should identify unused Node.js dependencies', () => {
    const checker = new KnipChecker(new PackageJsonDeducer(), dockerRunFn);

    const results: { checkResult: AnalysisResult[]; helpText: string } =
      checker.run(projectPath, true);
    assert.deepEqual(results.checkResult, [
      {
        status: 'UNUSED',
        category: 'runtime',
        dependency: { name: 'lodash' },
        sourceFile: 'package.json',
        position: { line: 14, column: 6 },
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
          ),
          link: new URL('https://www.npmjs.com/package/lodash'),
        },
      },
    ]);
  });
});
