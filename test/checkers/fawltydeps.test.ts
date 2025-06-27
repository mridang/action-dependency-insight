import * as path from 'path';
import * as assert from 'assert';
import { execSync } from 'child_process';
import { describe, test } from '@jest/globals';
import { FawltyDepsChecker } from '../../src/checkers/fawltydeps.js';
import { PyprojectTomlDeducer } from '../../src/deducers/pyproject-toml.js';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';

describe('FawltyDepsChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/python');
  const imageName = 'python-checker-test';

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
    const checker = new FawltyDepsChecker(errorRunFn);
    const deducer = new PyprojectTomlDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
    };
    const checker = new FawltyDepsChecker(errorRunFn);
    const deducer = new PyprojectTomlDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should identify unused Python dependencies', () => {
    const checker = new FawltyDepsChecker(dockerRunFn);
    const deducer = new PyprojectTomlDeducer();

    const results: AnalysisResult[] = checker.run(projectPath, deducer);
    assert.deepEqual(results, [
      {
        category: 'runtime',
        dependency: { name: 'faker' },
        position: { column: 1, line: 10 },
        sourceFile: 'pyproject.toml',
        status: 'UNUSED',
      },
    ]);
  });
});
