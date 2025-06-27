import { execSync } from 'child_process';
import { IPositionDeducer, IDependencyChecker } from '../interfaces.js';
import {
  AnalysisResult,
  DependencyCategory,
  DependencyStatus,
} from '../types.js';
import { ToolConfigurationError } from '../errors.js';

type RunFunction = (projectPath: string) => string;

interface KnipIssue {
  name: string;
  line: number;
  col: number;
}
interface KnipFileIssues {
  file: string;
  dependencies: KnipIssue[];
  devDependencies: KnipIssue[];
}
interface KnipOutput {
  issues: KnipFileIssues[];
}

export class KnipChecker implements IDependencyChecker {
  public readonly name: string = 'Knip';
  public readonly manifestFile: string = 'package.json';
  private readonly runFn: RunFunction;

  constructor(runFn?: RunFunction) {
    this.runFn = runFn || this.defaultRunFn;
  }

  public run(
    projectPath: string,
    deducer: IPositionDeducer,
    debug: boolean,
  ): AnalysisResult[] {
    try {
      const stdout = this.runFn(projectPath);
      if (debug) {
        console.debug(stdout);
      }
      return this.parseOutput(stdout, projectPath, deducer);
    } catch (error: unknown) {
      if (error instanceof Error && 'stderr' in error) {
        const stderr = (error as { stderr: string }).stderr;
        if (stderr.includes('command not found')) {
          throw new ToolConfigurationError(
            '`knip` is not installed.',
            'https://github.com/icanhazstring/composer-unused#installation',
            error,
          );
        }
      }
      if (error instanceof Error) {
        throw new ToolConfigurationError(
          `Execution failed for Knip: ${error.message}`,
          'https://knip.dev',
          error,
        );
      }
      throw error;
    }
  }

  private defaultRunFn(projectPath: string): string {
    return execSync(`npx knip --no-exit-code --no-progress --reporter=json`, {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  }

  // noinspection JSUnusedLocalSymbols
  private parseOutput(
    jsonOutput: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _deducer: IPositionDeducer,
  ): AnalysisResult[] {
    const data: KnipOutput = JSON.parse(jsonOutput);

    return (data.issues || [])
      .filter((issueFile) => issueFile.file === this.manifestFile)
      .flatMap((issueFile) => [
        ...issueFile.dependencies.map(
          (dep): AnalysisResult => ({
            status: DependencyStatus.UNUSED,
            category: DependencyCategory.RUNTIME,
            dependency: { name: dep.name },
            sourceFile: this.manifestFile,
            position: { line: dep.line, column: dep.col },
          }),
        ),
        ...issueFile.devDependencies.map(
          (dep): AnalysisResult => ({
            status: DependencyStatus.UNUSED,
            category: DependencyCategory.DEVELOPMENT,
            dependency: { name: dep.name },
            sourceFile: this.manifestFile,
            position: { line: dep.line, column: dep.col },
          }),
        ),
      ]);
  }
}
