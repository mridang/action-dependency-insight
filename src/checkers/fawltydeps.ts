import { execSync } from 'child_process';
import { IPositionDeducer, IDependencyChecker } from '../interfaces.js';
import {
  AnalysisResult,
  DependencyCategory,
  DependencyStatus,
} from '../types.js';
import { ToolConfigurationError } from '../errors.js';

type RunFunction = (projectPath: string) => string;

interface FawltyDepsFinding {
  name: string;
  references: { path: string }[];
}
interface FawltyDepsOutput {
  unused_deps?: FawltyDepsFinding[];
  undeclared_deps?: FawltyDepsFinding[];
}

export class FawltyDepsChecker implements IDependencyChecker {
  public readonly name: string = 'FawltyDeps';
  public readonly manifestFile: string = 'pyproject.toml';
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
            '`fawltydeps` is not installed.',
            'https://github.com/icanhazstring/composer-unused#installation',
            error,
          );
        }
      }
      if (error instanceof Error) {
        throw new ToolConfigurationError(
          `Execution failed for FawltyDeps: ${error.message}`,
          'https://github.com/trailofbits/fawltydeps#installation',
          error,
        );
      }
      throw error;
    }
  }

  private defaultRunFn(projectPath: string): string {
    const command: string = `poetry run fawltydeps --json`;
    try {
      return execSync(command, { cwd: projectPath, encoding: 'utf-8' });
    } catch (error) {
      // @ts-expect-error since these aren't errors
      if (error instanceof Error && [1, 2, 3, 4, 5].includes(error.status)) {
        return '';
      }
      throw error;
    }
  }

  private parseOutput(
    jsonOutput: string,
    projectPath: string,
    deducer: IPositionDeducer,
  ): AnalysisResult[] {
    const data: FawltyDepsOutput = JSON.parse(jsonOutput);

    console.log(jsonOutput);
    const unused: AnalysisResult[] = (data.unused_deps || []).map(
      (finding): AnalysisResult => {
        const sourceFile = finding.references[0]?.path ?? this.manifestFile;
        return {
          status: DependencyStatus.UNUSED,
          category: DependencyCategory.RUNTIME,
          dependency: { name: finding.name },
          sourceFile,
          position:
            deducer.findDependencyPosition(
              `${projectPath}/${sourceFile}`,
              finding.name,
            ) ?? undefined,
        };
      },
    );

    const undeclared: AnalysisResult[] = (data.undeclared_deps || []).map(
      (finding): AnalysisResult => ({
        status: DependencyStatus.UNDECLARED,
        category: DependencyCategory.UNKNOWN,
        dependency: { name: finding.name },
        sourceFile: finding.references[0]?.path ?? 'unknown',
      }),
    );

    return [...unused, ...undeclared];
  }
}
