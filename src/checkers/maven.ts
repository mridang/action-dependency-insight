/**
 * Dependency checker that runs the Maven dependency analyzer and reads its HTML report.
 * @file
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { MAX_OUTPUT_BUFFER } from './exec-options.js';
import { readFile } from 'node:fs/promises';
import { pathExists } from './path-exists.js';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import { IDependencyChecker, IPositionDeducer } from '../interfaces.js';
import {
  AnalysisResult,
  DependencyCategory,
  DependencyStatus,
} from '../types.js';
import { ToolConfigurationError } from '../errors.js';
import { Element } from 'domhandler';

const execAsync = promisify(exec);

type RunFunction = (projectPath: string) => Promise<string>;

const helpText = `
<br />
This report was generated using the **[dependency-analyzer-maven-plugin](https://maven.apache.org/plugins/maven-dependency-plugin/analyze-mojo.html)**. This action acts as a wrapper around the tool to provide integrated checks within your GitHub workflow.
<br />
<br />
If you believe a dependency has been incorrectly flagged, we recommend the following steps:

1.  **Run Locally:** Execute the tool in your local environment to replicate the findings. This helps isolate whether the issue is with the tool's analysis or the GitHub Action's environment.

    \`\`\`bash
    mvn site
    \`\`\`

    Then open \`target/site/dependency-analysis.html\` or \`target/reports/dependency-analysis.html\` in your browser.

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. The plugin has various configuration options to fine-tune its analysis. Please refer to the official **[dependency:analyze documentation](https://maven.apache.org/plugins/maven-dependency-plugin/analyze-mojo.html)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with the Maven plugin itself. Please follow the instructions for reporting issues on the **[Maven project's issue management page](https://maven.apache.org/issue-management.html)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.
`;

/**
 * Checks Maven projects for unused and undeclared dependencies using the
 * dependency analyzer plugin.
 */
export class MavenChecker implements IDependencyChecker {
  public readonly name: string = 'Maven Dependency Analyzer';
  public readonly manifestFile: string = 'pom.xml';
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
      const htmlOutput = await this.runFn(projectPath);
      if (debug) {
        console.debug(htmlOutput);
      }
      return {
        helpText,
        checkResult: await this.parseOutput(htmlOutput, projectPath),
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'stderr' in error) {
        const stderr = (error as { stderr: string }).stderr;
        if (stderr.includes('command not found')) {
          throw new ToolConfigurationError(
            '`mvn` is not installed.',
            'https://maven.apache.org/install.html',
            error,
          );
        }
      }
      if (error instanceof Error) {
        throw new ToolConfigurationError(
          `Execution failed for Maven: ${error.message}`,
          'https://maven.apache.org/plugins/maven-dependency-plugin/analyze-mojo.html',
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Runs the Maven analysis goal and returns the generated HTML report.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns A promise of the contents of the dependency analysis HTML report.
   * @example
   * const html = this.defaultRunFn('/workspace/app');
   */
  private async defaultRunFn(projectPath: string): Promise<string> {
    const command = 'mvn dependency:analyze-report';
    await execAsync(command, {
      cwd: projectPath,
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT_BUFFER,
    });
    const siteReportPath = path.join(
      projectPath,
      'target',
      'site',
      'dependency-analysis.html',
    );
    const reportsReportPath = path.join(
      projectPath,
      'target',
      'reports',
      'dependency-analysis.html',
    );
    const reportPath = (await pathExists(reportsReportPath))
      ? reportsReportPath
      : siteReportPath;
    return readFile(reportPath, 'utf8');
  }

  /**
   * Extracts the dependency rows from one section of the Maven report.
   * @param $ - The loaded HTML document of the report.
   * @param sectionId - The identifier of the report heading for the section.
   * @param status - The dependency status to assign to every row found.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns A promise of the analysis results found in the section.
   * @example
   * const rows = await this.parseSection($, 'Unused_but_Declared_Dependencies', DependencyStatus.UNUSED, '/workspace/app');
   */
  private async parseSection(
    $: CheerioAPI,
    sectionId: string,
    status: DependencyStatus,
    projectPath: string,
  ): Promise<AnalysisResult[]> {
    const rows: string[][] = [];
    const table = $(`#${sectionId}`).parent().find('table');

    table.find('tr').each((_: number, row: Element) => {
      const cells: string[] = $(row)
        .find('td')
        .map((__: number, cell: Element) => $(cell).text())
        .get();

      if (cells.length >= 7) {
        rows.push(cells);
      }
    });

    return Promise.all(
      rows.map(async (cells): Promise<AnalysisResult> => {
        const [groupId, artifactId, version, scope] = cells;
        const optional = cells[6];
        const name = `${groupId}:${artifactId}`;

        return {
          status,
          category:
            scope === 'test'
              ? DependencyCategory.DEVELOPMENT
              : DependencyCategory.RUNTIME,
          dependency: { name, version },
          sourceFile: this.manifestFile,
          optional: optional === 'true',
          position:
            (await this.deducer.findDependencyPosition(
              `${projectPath}/${this.manifestFile}`,
              name,
            )) ?? undefined,
          extra: {
            link: new URL(
              `https://search.maven.org/artifact/${groupId}/${artifactId}`,
            ),
            icon: new URL(
              'https://raw.githubusercontent.com/mridang/action-dependency-insight/main/res/maven.svg',
            ),
          },
        };
      }),
    );
  }

  /**
   * Converts the Maven HTML report into the standard analysis results.
   * @param htmlOutput - The HTML content of the dependency analysis report.
   * @param projectPath - The absolute path to the project's root directory.
   * @returns A promise of the unused and then the undeclared dependency results.
   * @example
   * const results = await this.parseOutput(html, '/workspace/app');
   */
  private async parseOutput(
    htmlOutput: string,
    projectPath: string,
  ): Promise<AnalysisResult[]> {
    const $ = load(htmlOutput);
    const unused = await this.parseSection(
      $,
      'Unused_but_Declared_Dependencies',
      DependencyStatus.UNUSED,
      projectPath,
    );
    const undeclared = await this.parseSection(
      $,
      'Used_but_Undeclared_Dependencies',
      DependencyStatus.UNDECLARED,
      projectPath,
    );
    return [...unused, ...undeclared];
  }
}
