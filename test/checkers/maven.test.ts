import * as path from 'path';
import * as assert from 'assert';
import { execSync } from 'child_process';
import { describe, test } from '@jest/globals';
import { AnalysisResult } from '../../src/types.js';
import { ToolConfigurationError } from '../../src/errors.js';
import { MavenChecker } from '../../src/checkers/maven.js';
import { PomXmlDeducer } from '../../src/deducers/pom-xml.js';

describe('MavenChecker (Docker)', () => {
  const projectPath = path.resolve(process.cwd(), 'test/checkers/maven');
  const imageName = 'maven-checker-test';

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
    const checker = new MavenChecker(new PomXmlDeducer(), errorRunFn);
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should throw an error for any generic error', () => {
    const errorRunFn = () => {
      throw new Error();
    };
    const checker = new MavenChecker(new PomXmlDeducer(), errorRunFn);
    assert.throws(() => checker.run(projectPath, true), ToolConfigurationError);
  });

  test('should identify unused maven dependencies', () => {
    const checker = new MavenChecker(new PomXmlDeducer(), dockerRunFn);

    const results: { checkResult: AnalysisResult[]; helpText: string } =
      checker.run(projectPath, true);
    assert.deepEqual(results.checkResult, [
      {
        category: 'runtime',
        dependency: {
          name: 'org.apache.commons:commons-lang3',
          version: '3.12.0',
        },
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/main/res/maven.svg',
          ),
          link: new URL(
            'https://search.maven.org/artifact/org.apache.commons/commons-lang3',
          ),
        },
        optional: false,
        position: { column: 3, line: 13 },
        sourceFile: 'pom.xml',
        status: 'UNUSED',
      },
      {
        category: 'runtime',
        dependency: { name: 'com.google.code.gson:gson', version: '2.8.8' },
        extra: {
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/main/res/maven.svg',
          ),
          link: new URL(
            'https://search.maven.org/artifact/com.google.code.gson/gson',
          ),
        },
        optional: false,
        position: { column: 3, line: 18 },
        sourceFile: 'pom.xml',
        status: 'UNUSED',
      },
    ]);
  });
});
