/**
 * Dependency checker that wraps FawltyDeps to find unused and undeclared Python packages.
 * @file
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { DependencyCategory, DependencyStatus } from '../types.js';
import { ToolConfigurationError } from '../errors.js';
import { MAX_OUTPUT_BUFFER } from './exec-options.js';
import { pathExists } from './path-exists.js';
import {
  isListOf,
  isOptionalListOf,
  isString,
  hasProperty,
} from './json-guards.js';
import type { IDependencyChecker, IPositionDeducer } from '../interfaces.js';
import type { AnalysisResult } from '../types.js';

const execAsync = promisify(exec);

type RunFunction = (projectPath: string) => Promise<string>;

interface FawltyDepsFinding {
  name: string;
  references: { path: string }[];
}
interface FawltyDepsOutput {
  unused_deps?: FawltyDepsFinding[];
  undeclared_deps?: FawltyDepsFinding[];
}

/**
 * Tells whether a parsed JSON value is a reference to a source file.
 * @param value - The parsed JSON value.
 * @returns True when the value has a string `path`.
 * @example
 * isReference({ path: 'a.py' }); // true
 */
function isReference(value: unknown): value is { path: string } {
  return hasProperty(value, 'path', isString);
}

/**
 * Tells whether a parsed JSON value is a FawltyDeps finding.
 * @param value - The parsed JSON value.
 * @returns True when the value has a name and a list of references.
 * @example
 * isFinding({ name: 'a', references: [] }); // true
 */
function isFinding(value: unknown): value is FawltyDepsFinding {
  return (
    hasProperty(value, 'name', isString) &&
    hasProperty(value, 'references', (references) =>
      isListOf(references, isReference),
    )
  );
}

/**
 * Tells whether a parsed JSON value has the shape of FawltyDeps' report.
 * @param value - The parsed JSON value.
 * @returns True when the value is a FawltyDeps report.
 * @example
 * isFawltyDepsOutput({ unused_deps: [] }); // true
 */
function isFawltyDepsOutput(value: unknown): value is FawltyDepsOutput {
  return (
    hasProperty(value, 'unused_deps', (findings) =>
      isOptionalListOf(findings, isFinding),
    ) &&
    hasProperty(value, 'undeclared_deps', (findings) =>
      isOptionalListOf(findings, isFinding),
    )
  );
}

/**
 * The lock files FawltyDeps can run against, in priority order, each paired
 * with the command that runs the tool through that lock file's package manager.
 */
const LOCKFILE_COMMANDS: [string, string][] = [
  ['poetry.lock', 'poetry run fawltydeps --json'],
  ['uv.lock', 'uv run fawltydeps --json'],
];

const helpText = `
<br />
This report was generated using **[FawltyDeps](https://github.com/trailofbits/Fawltydeps)**, a tool for identifying unused dependencies in Python projects. This action acts as a wrapper around the tool to provide integrated checks within your GitHub workflow.
<br />
<br />
If you believe a dependency has been incorrectly flagged, we recommend the following steps:

1.  **Run Locally:** Execute the tool in your local environment to replicate the findings. This helps isolate whether the issue is with the tool's analysis or the GitHub Action's environment.

    \`\`\`bash
    # Using uv (uv.lock)
    uv run fawltydeps

    # Using Poetry (poetry.lock)
    poetry run fawltydeps
    \`\`\`

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. For example, you may need to ignore certain dependencies that are used in ways static analysis cannot detect. Please refer to the official **[FawltyDeps configuration guide](https://github.com/trailofbits/fawltydeps#configuration)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with FawltyDeps itself. Please open an issue on the **[FawltyDeps repository](https://github.com/trailofbits/Fawltydeps/issues)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.
`;

/**
 * Checks Python projects for unused and undeclared dependencies using FawltyDeps.
 */
export class FawltyDepsChecker implements IDependencyChecker {
  public readonly name: string = 'FawltyDeps';
  public readonly manifestFile: string = 'pyproject.toml';
  private readonly runFn: RunFunction;

  constructor(
    private readonly deducer: IPositionDeducer,
    runFn?: RunFunction,
  ) {
    this.runFn = runFn ?? this.defaultRunFn.bind(this);
  }

  /**
   * Runs the checker against a project and maps its output to analysis results.
   * @param projectPath - The absolute path to the project's root directory.
   * @param debug - Whether to log the raw tool output to the console.
   * @returns A promise of the analysis results together with the troubleshooting help text.
   * @throws ToolConfigurationError when the tool is missing or fails to run.
   * @example
   * const { checkResult } = await checker.run('/workspace/app', false);
   */
  public async run(
    projectPath: string,
    debug: boolean,
  ): Promise<{ checkResult: AnalysisResult[]; helpText: string }> {
    try {
      const stdout = await this.runFn(projectPath);
      if (debug) {
        console.debug(stdout);
      }
      return {
        helpText,
        checkResult: await this.parseOutput(stdout, projectPath),
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'stderr' in error) {
        const stderr: unknown = error.stderr;
        if (
          typeof stderr === 'string' &&
          stderr.includes('command not found')
        ) {
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

  /**
   * Runs FawltyDeps through the lock file's package manager and returns its JSON report.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns A promise of the raw JSON report, or an empty string when FawltyDeps reports findings.
   * @throws Error when the project has neither a poetry.lock nor a uv.lock file.
   * @example
   * const report = await this.defaultRunFn('/workspace/app');
   */
  private async defaultRunFn(projectPath: string): Promise<string> {
    const present = await Promise.all(
      LOCKFILE_COMMANDS.map(async ([lockFile]) =>
        pathExists(path.join(projectPath, lockFile)),
      ),
    );
    const command: string | null =
      LOCKFILE_COMMANDS.find((_, index) => present[index])?.[1] ?? null;

    if (!command) {
      throw new Error(
        'No supported Python lockfile found. Add poetry.lock or uv.lock to run FawltyDeps.',
      );
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT_BUFFER,
      });
      process.stderr.write(stderr);
      return stdout;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        typeof error.code === 'number' &&
        [1, 2, 3, 4, 5].includes(error.code)
      ) {
        return '';
      }
      throw error;
    }
  }

  /**
   * Converts FawltyDeps' JSON report into the standard analysis results.
   * @param jsonOutput - The raw JSON report produced by FawltyDeps.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns A promise of one analysis result per unused or undeclared package.
   * @example
   * const results = await this.parseOutput('{"unused_deps":[]}', '/workspace/app');
   */
  private async parseOutput(
    jsonOutput: string,
    projectPath: string,
  ): Promise<AnalysisResult[]> {
    const data: unknown = JSON.parse(jsonOutput);
    if (!isFawltyDepsOutput(data)) {
      throw new TypeError('FawltyDeps printed an unexpected report.');
    }

    const unused: AnalysisResult[] = await Promise.all(
      (data.unused_deps ?? []).map(async (finding): Promise<AnalysisResult> => {
        const sourceFile = finding.references[0]?.path ?? this.manifestFile;
        return {
          status: DependencyStatus.UNUSED,
          category: DependencyCategory.RUNTIME,
          dependency: { name: finding.name },
          sourceFile,
          position:
            (await this.deducer.findDependencyPosition(
              `${projectPath}/${sourceFile}`,
              finding.name,
            )) ?? undefined,
          extra: {
            link: new URL(`https://pypi.org/project/${finding.name}`),
            icon: new URL(
              'https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/npm.svg',
            ),
          },
        };
      }),
    );

    const undeclared: AnalysisResult[] = (data.undeclared_deps ?? []).map(
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
