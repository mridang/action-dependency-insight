import { execSync } from 'child_process';
import { IDependencyChecker, IPositionDeducer } from '../interfaces.js';
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

const helpText = `
<br />
This report was generated using **[FawltyDeps](https://github.com/trailofbits/Fawltydeps)**, a tool for identifying unused dependencies in Python projects. This action acts as a wrapper around the tool to provide integrated checks within your GitHub workflow.
<br />
<br />
If you believe a dependency has been incorrectly flagged, we recommend the following steps:

1.  **Run Locally:** Execute the tool in your local environment to replicate the findings. This helps isolate whether the issue is with the tool's analysis or the GitHub Action's environment.

    \`\`\`bash
    poetry run fawltydeps
    \`\`\`

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. For example, you may need to ignore certain dependencies that are used in ways static analysis cannot detect. Please refer to the official **[FawltyDeps configuration guide](https://github.com/trailofbits/fawltydeps#configuration)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with FawltyDeps itself. Please open an issue on the **[FawltyDeps repository](https://github.com/trailofbits/Fawltydeps/issues)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.
`;

export class FawltyDepsChecker implements IDependencyChecker {
  public readonly name: string = 'FawltyDeps';
  public readonly manifestFile: string = 'pyproject.toml';
  private readonly runFn: RunFunction;

  constructor(
    private readonly deducer: IPositionDeducer,
    runFn?: RunFunction,
  ) {
    this.runFn = runFn || this.defaultRunFn;
  }

  public run(
    projectPath: string,
    debug: boolean,
  ): { checkResult: AnalysisResult[]; helpText: string } {
    try {
      const stdout = this.runFn(projectPath);
      if (debug) {
        console.debug(stdout);
      }
      return {
        helpText,
        checkResult: this.parseOutput(stdout, projectPath),
      };
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
  ): AnalysisResult[] {
    const data: FawltyDepsOutput = JSON.parse(jsonOutput);

    const unused: AnalysisResult[] = (data.unused_deps || []).map(
      (finding): AnalysisResult => {
        const sourceFile = finding.references[0]?.path ?? this.manifestFile;
        return {
          status: DependencyStatus.UNUSED,
          category: DependencyCategory.RUNTIME,
          dependency: { name: finding.name },
          sourceFile,
          position:
            this.deducer.findDependencyPosition(
              `${projectPath}/${sourceFile}`,
              finding.name,
            ) ?? undefined,
          extra: {
            link: new URL(`https://pypi.org/project/${finding.name}`),
            icon: new URL(
              'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
            ),
          },
        };
      },
    );

    const undeclared: AnalysisResult[] = (data.undeclared_deps || []).map(
      (finding): AnalysisResult => ({
        status: DependencyStatus.UNDECLARED,
        category: DependencyCategory.UNKNOWN,
        dependency: { name: finding.name },
        sourceFile: finding.references[0]?.path ?? 'unknown',
        extra: {
          link: new URL(`https://pypi.org/project/${finding.name}`),
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
          ),
        },
      }),
    );

    return [...unused, ...undeclared];
  }
}
