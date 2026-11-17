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
import { ToolConfigurationError } from '../../src/errors.js';
import type { AnalysisResult } from '../../src/types.js';

describe('FawltyDepsChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/python');
  const imageName = 'python-checker-test';

  const dockerRunFn = async (): Promise<string> => {
    execSync(
      `docker build --tag=${imageName} --file=${projectPath}/Dockerfile ${projectPath}`,
      { stdio: 'inherit' },
    );

    return execSync(`docker run --rm ${imageName}`, { encoding: 'utf8' });
  };

  test('should throw an error if command is not found', async () => {
    const errorRunFn = async (): Promise<string> => {
      throw Object.assign(new Error('Command failed'), {
        stderr: 'command not found',
      });
    };
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      errorRunFn,
    );
    await assert.rejects(
      async () => checker.run(projectPath, true),
      ToolConfigurationError,
    );
  });

  test('should throw an error when the tool prints an unexpected report', async () => {
    const malformedRunFn = async (): Promise<string> =>
      '{"unused_deps":[{"name":"requests"}]}';
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      malformedRunFn,
    );
    await assert.rejects(
      async () => checker.run(projectPath, true),
      ToolConfigurationError,
    );
  });

  test('should throw an error for any generic error', async () => {
    const errorRunFn = async (): Promise<string> => {
      throw new Error('Generic failure');
    };
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      errorRunFn,
    );
    await assert.rejects(
      async () => checker.run(projectPath, true),
      ToolConfigurationError,
    );
  });

  test('should identify unused Python dependencies', async () => {
    const checker = new FawltyDepsChecker(
      new PyprojectTomlDeducer(),
      dockerRunFn,
    );

    const results: { checkResult: AnalysisResult[]; helpText: string } =
      await checker.run(projectPath, true);
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
