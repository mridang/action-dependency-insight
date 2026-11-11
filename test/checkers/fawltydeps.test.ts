/**
 * Tests for the FawltyDepsChecker, run through a Docker image built from the fixture.
 * @file
 */
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { describe, test } from '@jest/globals';
import { FawltyDepsChecker } from '../../src/checkers/fawltydeps.js';
import { PyprojectTomlDeducer } from '../../src/deducers/pyproject-toml.js';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';

describe('FawltyDepsChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/python');
  const imageName = 'python-checker-test';

  const dockerRunFn = (): string => {
    // eslint-disable-next-line n/no-sync -- injected RunFunction in src/checkers must return a string synchronously because Checker.run() is synchronous and production source is out of scope
    execSync(
      `docker build --tag=${imageName} --file=${projectPath}/Dockerfile ${projectPath}`,
      { stdio: 'inherit' },
    );
    // eslint-disable-next-line n/no-sync -- injected RunFunction in src/checkers must return a string synchronously because Checker.run() is synchronous and production source is out of scope
    return execSync(`docker run --rm ${imageName}`, { encoding: 'utf8' });
  };

  test('should throw an error if command is not found', () => {
    const errorRunFn = () => {
      const err = new Error('Command failed');
      // @ts-expect-error since this is a test
      (err as never).stderr = 'command not found';
      throw err;
    };
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      errorRunFn,
    );
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error('Generic failure');
    };
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      errorRunFn,
    );
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should identify unused Python dependencies', () => {
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      dockerRunFn,
    );

    const results: { checkResult: AnalysisResult[]; helpText: string } =
      checker.run(projectPath, true);
    assert.deepEqual(results.checkResult, [
      {
        category: 'runtime',
        dependency: { name: 'faker' },
        position: { column: 1, line: 10 },
        sourceFile: 'pyproject.toml',
        status: 'UNUSED',
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
          ),
          link: new URL('https://pypi.org/project/faker'),
        },
      },
    ]);
  });
});
