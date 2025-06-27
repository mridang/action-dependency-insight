import * as path from 'path';
import * as assert from 'assert';
import { execSync } from 'child_process';
import { describe, test } from '@jest/globals';
import { KnipChecker } from '../../src/checkers/knip.js';
import { PackageJsonDeducer } from '../../src/deducers/package-json.js';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';

describe('KnipChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/node');
  const imageName = 'node-checker-test';

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
    const checker = new KnipChecker(errorRunFn);
    const deducer = new PackageJsonDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
    };
    const checker = new KnipChecker(errorRunFn);
    const deducer = new PackageJsonDeducer();
    assert.throws(
      () => checker.run(projectPath, deducer),
      ToolConfigurationError,
    );
  });

  test('should identify unused Node.js dependencies', () => {
    const checker = new KnipChecker(dockerRunFn);
    const deducer = new PackageJsonDeducer();

    const results: AnalysisResult[] = checker.run(projectPath, deducer);
    assert.deepEqual(results, [
      {
        status: 'UNUSED',
        category: 'runtime',
        dependency: { name: 'lodash' },
        sourceFile: 'package.json',
        position: { line: 14, column: 6 },
      },
    ]);
  });
});
