/**
 * Dependency checker that wraps composer-unused to find unused PHP packages.
 * @file
 */
import { execSync } from 'node:child_process';
import { MAX_OUTPUT_BUFFER } from './exec-options.js';
import { IDependencyChecker, IPositionDeducer } from '../interfaces.js';
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

const helpText = `
<br />
This report was generated using **[composer-unused](https://github.com/icanhazstring/composer-unused)**, a tool for identifying unused dependencies in PHP projects. This action acts as a wrapper around the tool to provide integrated checks within your GitHub workflow.
<br />
<br />
If you believe a dependency has been incorrectly flagged, we recommend the following steps:

1.  **Run Locally:** Execute the tool in your local environment to replicate the findings. This helps isolate whether the issue is with the tool's analysis or the GitHub Action's environment.

    \`\`\`bash
    ./vendor/bin/composer-unused
    \`\`\`

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. For example, you may need to tell the tool which directories to scan for code. Please refer to the official **[composer-unused configuration guide](https://github.com/icanhazstring/composer-unused#configuration)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with composer-unused itself. Please open an issue on the **[composer-unused repository](https://github.com/icanhazstring/composer-unused/issues)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.
`;

/**
 * Checks PHP projects for unused dependencies using composer-unused.
 */
export class ComposerUnusedChecker implements IDependencyChecker {
  public readonly name: string = 'Composer Unused';
  public readonly manifestFile: string = 'composer.json';
  private readonly runFn: RunFunction;

  constructor(
    private readonly deducer: IPositionDeducer,
    runFn?: RunFunction,
  ) {
    this.runFn = runFn || this.defaultRunFn;
  }

  /**
   * Runs the checker against a project and maps its output to analysis results.
   * @param projectPath - The absolute path to the project's root directory.
   * @param debug - Whether to log the raw tool output to the console.
   * @returns The analysis results together with the troubleshooting help text.
   * @throws ToolConfigurationError when the tool is missing or fails to run.
   * @example
   * const { checkResult } = checker.run('/workspace/app', false);
   */
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

  /**
   * Executes composer-unused in the project directory and returns its JSON report.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns The raw JSON report written to standard output.
   * @example
   * const report = this.defaultRunFn('/workspace/app');
   */
  private defaultRunFn(projectPath: string): string {
    const command: string = `./vendor/bin/composer-unused --no-progress --ignore-exit-code --output-format=json`;
    // eslint-disable-next-line n/no-sync -- the checker contract is synchronous, so the tool runs synchronously
    return execSync(command, {
      cwd: projectPath,
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT_BUFFER,
    });
  }

  /**
   * Converts composer-unused's JSON report into the standard analysis results.
   * @param jsonOutput - The raw JSON report produced by composer-unused.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns One analysis result per unused package, excluding the PHP runtime.
   * @example
   * const results = this.parseOutput('{"unused-packages":[]}', '/workspace/app');
   */
  private parseOutput(
    jsonOutput: string,
    projectPath: string,
  ): AnalysisResult[] {
    const data: ComposerUnusedOutput = JSON.parse(jsonOutput);
    const manifestPath: string = `${projectPath}/${this.manifestFile}`;

    return (data['unused-packages'] || [])
      .filter((pkg) => pkg !== 'php')
      .map((pkg): AnalysisResult => ({
        status: DependencyStatus.UNUSED,
        category: DependencyCategory.UNKNOWN,
        dependency: { name: pkg },
        sourceFile: this.manifestFile,
        position:
          this.deducer.findDependencyPosition(manifestPath, pkg) ?? undefined,
        extra: {
          link: new URL(`https://packagist.org/packages/${pkg}`),
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/packagist.svg',
          ),
        },
      }));
  }
}
