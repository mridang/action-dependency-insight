import { execSync } from 'child_process';
import { IPositionDeducer, IDependencyChecker } from '../interfaces.js';
import {
  AnalysisResult,
  DependencyCategory,
  DependencyStatus,
} from '../types.js';
import { ToolConfigurationError } from '../errors.js';

type RunFunction = (projectPath: string) => string;

interface ComposerUnusedOutput {
  'unused-packages'?: string[];
}

export class ComposerUnusedChecker implements IDependencyChecker {
  public readonly name: string = 'Composer Unused';
  public readonly manifestFile: string = 'composer.json';
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
            '`composer-unused` is not installed.',
            'https://github.com/icanhazstring/composer-unused#installation',
            error,
          );
        }
      }
      if (error instanceof Error) {
        throw new ToolConfigurationError(
          `Execution failed for Composer: ${error.message}`,
          'https://www.docker.com/get-started',
          error,
        );
      }
      throw error;
    }
  }

  private defaultRunFn(projectPath: string): string {
    const command: string = `./vendor/bin/composer-unused --no-progress --ignore-exit-code --output-format=json`;
    return execSync(command, { cwd: projectPath, encoding: 'utf-8' });
  }

  private parseOutput(
    jsonOutput: string,
    projectPath: string,
    deducer: IPositionDeducer,
  ): AnalysisResult[] {
    const data: ComposerUnusedOutput = JSON.parse(jsonOutput);
    const manifestPath: string = `${projectPath}/${this.manifestFile}`;

    return (data['unused-packages'] || [])
      .filter((pkg) => pkg !== 'php')
      .map(
        (pkg): AnalysisResult => ({
          status: DependencyStatus.UNUSED,
          category: DependencyCategory.UNKNOWN,
          dependency: { name: pkg },
          sourceFile: this.manifestFile,
          position:
            deducer.findDependencyPosition(manifestPath, pkg) ?? undefined,
        }),
      );
  }
}
