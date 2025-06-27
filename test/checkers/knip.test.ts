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
    const checker = new KnipChecker(new PackageJsonDeducer(), errorRunFn);
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
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
