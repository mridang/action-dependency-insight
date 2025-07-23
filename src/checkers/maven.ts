import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { IDependencyChecker, IPositionDeducer } from '../interfaces.js';
import {
  AnalysisResult,
  DependencyCategory,
  DependencyStatus,
} from '../types.js';
import { ToolConfigurationError } from '../errors.js';
import { Element } from 'domhandler';

type RunFunction = (projectPath: string) => string;

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

    Then open \`target/site/dependency-analysis.html\` in your browser.

2.  **Check Configuration:** Many inaccuracies can be resolved by configuring the underlying tool. The plugin has various configuration options to fine-tune its analysis. Please refer to the official **[dependency:analyze documentation](https://maven.apache.org/plugins/maven-dependency-plugin/analyze-mojo.html)**.

3.  **Report the Issue:**
    - If the results are **also incorrect when run locally**, the issue is likely with the Maven plugin itself. Please follow the instructions for reporting issues on the **[Maven project's issue management page](https://maven.apache.org/issue-management.html)**.
    - If the local results **are correct** but the GitHub Action's results are not, the issue is with this action's wrapper. Please open an issue on **this repository's issue tracker**.
`;

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

  public run(
    projectPath: string,
    debug: boolean,
  ): { checkResult: AnalysisResult[]; helpText: string } {
    try {
      const htmlOutput = this.runFn(projectPath);
      if (debug) {
        console.debug(htmlOutput);
      }
      return {
        helpText,
        checkResult: this.parseOutput(htmlOutput, projectPath),
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

  private defaultRunFn(projectPath: string): string {
    const command = `mvn dependency:analyze-report && cat target/site/dependency-analysis.html`;
    return execSync(command, {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  }

  private parseSection(
    $: cheerio.CheerioAPI,
    sectionId: string,
    status: DependencyStatus,
    projectPath: string,
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const table = $(`#${sectionId}`).parent().find('table');

    table.find('tr').each((_: number, row: Element) => {
      const cells: string[] = $(row)
        .find('td')
        .map((__: number, cell: Element) => $(cell).text())
        .get();

      if (cells.length < 7) {
        return;
      }

      const [groupId, artifactId, version, scope, , , optional] = cells;
      const name = `${groupId}:${artifactId}`;

      results.push({
        status,
        category:
          scope === 'test'
            ? DependencyCategory.DEVELOPMENT
            : DependencyCategory.RUNTIME,
        dependency: { name, version },
        sourceFile: this.manifestFile,
        optional: optional === 'true',
        position:
          this.deducer.findDependencyPosition(
            `${projectPath}/${this.manifestFile}`,
            name,
          ) ?? undefined,
        extra: {
          link: new URL(
            `https://search.maven.org/artifact/${groupId}/${artifactId}`,
          ),
          icon: new URL(
            'https://raw.githubusercontent.com/mridang/action-dependency-insight/main/res/maven.svg',
          ),
        },
      });
    });

    return results;
  }

  private parseOutput(
    htmlOutput: string,
    projectPath: string,
  ): AnalysisResult[] {
    const $ = cheerio.load(htmlOutput);
    const unused = this.parseSection(
      $,
      'Unused_but_Declared_Dependencies',
      DependencyStatus.UNUSED,
      projectPath,
    );
    const undeclared = this.parseSection(
      $,
      'Used_but_Undeclared_Dependencies',
      DependencyStatus.UNDECLARED,
      projectPath,
    );
    return [...unused, ...undeclared];
  }
}
