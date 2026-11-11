/**
 * Dependency checker that wraps Knip to find unused and unlisted npm packages.
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

interface KnipIssue {
  name: string;
  line: number;
  col: number;
}
interface KnipFileIssues {
  file: string;
  dependencies?: KnipIssue[];
  devDependencies?: KnipIssue[];
  unlisted?: KnipIssue[];
  unresolved?: KnipIssue[];
}
const issueProcessors: {
  key: keyof KnipFileIssues;
  status: DependencyStatus;
  category: DependencyCategory;
}[] = [
  {
    key: 'dependencies',
    status: DependencyStatus.UNUSED,
    category: DependencyCategory.RUNTIME,
  },
  {
    key: 'devDependencies',
    status: DependencyStatus.UNUSED,
    category: DependencyCategory.DEVELOPMENT,
  },
  {
    key: 'unlisted',
    status: DependencyStatus.UNDECLARED,
    category: DependencyCategory.RUNTIME,
  },
  {
    key: 'unresolved',
    status: DependencyStatus.UNDECLARED,
    category: DependencyCategory.UNKNOWN,
  },
];

const helpText = `
<br />
This report was generated using **[Knip](https://knip.dev)**, a tool for identifying unused files, exports, and dependencies in JavaScript/TypeScript projects. This action acts as a wrapper around the tool to provide integrated checks within your GitHub workflow.
<br />
<br />
If you believe a dependency has been incorrectly flagged, we recommend the following steps:

1.  **Run Locally:** Execute the tool in your local environment to replicate the findings. This helps isolate whether the issue is with the tool's analysis or the GitHub Action's environment.

    \`\`\`bash
    npx knip
    \`\`\`

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. For example, you may need to define entry points or ignore specific files. Please refer to the official **[Knip configuration guide](https://knip.dev/overview/configuration)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with Knip itself. Please open an issue on the **[Knip repository](https://github.com/webpro/knip/issues)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.

`;

/**
 * Checks Node.js projects for unused and undeclared dependencies using Knip.
 */
export class KnipChecker implements IDependencyChecker {
  public readonly name: string = 'Knip';
  public readonly manifestFile: string = 'package.json';
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
        checkResult: this.parseOutput(stdout),
      };
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

  /**
   * Executes Knip in the project directory and returns its JSON report.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns The raw JSON report written to standard output.
   * @example
   * const report = this.defaultRunFn('/workspace/app');
   */
  private defaultRunFn(projectPath: string): string {
    // eslint-disable-next-line n/no-sync -- the checker contract is synchronous, so the tool runs synchronously
    return execSync(`npx knip --no-exit-code --no-progress --reporter=json`, {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT_BUFFER,
    });
  }

  /**
   * Converts Knip's JSON report into the standard analysis results.
   * @param jsonOutput - The raw JSON report produced by Knip.
   * @returns One analysis result per flagged dependency.
   * @example
   * const results = this.parseOutput('{"issues":[]}');
   */
  private parseOutput(jsonOutput: string): AnalysisResult[] {
    const parsedData = JSON.parse(jsonOutput);
    const data: KnipFileIssues[] = parsedData.issues || [];

    return data.flatMap((file) =>
      issueProcessors.flatMap(
        (processor) =>
          (file[processor.key] as KnipIssue[])?.map((dep) => ({
            status: processor.status,
            category: processor.category,
            dependency: { name: dep.name },
            sourceFile: file.file,
            ...(dep.line &&
              dep.col && { position: { line: dep.line, column: dep.col } }),
            extra: {
              link: new URL(`https://www.npmjs.com/package/${dep.name}`),
              icon: new URL(
                'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
              ),
            },
          })) ?? [],
      ),
    );
  }
}
