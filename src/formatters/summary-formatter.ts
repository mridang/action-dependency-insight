/**
 * Writes the analysis results to GitHub annotations and the job summary.
 * @file
 */
import { error, summary } from '@actions/core';
import { AnalysisResult, DependencyStatus } from '../types.js';
import { IFormatter } from '../interfaces.js';
import { context } from '@actions/github';

type Context = typeof context;
const ContextCtor = context.constructor as new () => Context;

type SummaryTableRow = { data: string; header?: boolean }[];

/**
 * Publishes analysis results as workflow annotations and a job summary table.
 */
export class SummaryFormatter implements IFormatter {
  /**
   * Creates the annotations and writes the job summary for the results.
   * @param results - The analysis results to publish.
   * @param helpText - The troubleshooting guidance to place in the summary.
   * @returns A promise that resolves once the summary has been written.
   * @example
   * await new SummaryFormatter().format(results, helpText);
   */
  public async format(
    results: AnalysisResult[],
    helpText: string,
  ): Promise<void> {
    this.createAnnotations(results);
    await this.generateSummary(results, helpText);
  }

  /**
   * Emits a workflow error annotation for each result that has a position.
   * @param results - The analysis results to annotate.
   * @example
   * this.createAnnotations(results);
   */
  private createAnnotations(results: AnalysisResult[]): void {
    results.forEach((result) => {
      if (result.position) {
        error(`Unused dependency: ${result.dependency.name}`, {
          title: `Unused ${result.category} dependency`,
          file: result.sourceFile,
          startLine: result.position.line,
          startColumn: result.position.column,
        });
      }
    });
  }

  /**
   * Writes the results table and troubleshooting details to the job summary.
   * @param results - The analysis results to tabulate.
   * @param helpText - The troubleshooting guidance placed in a details block.
   * @returns A promise that resolves once the summary has been written.
   * @example
   * await this.generateSummary(results, helpText);
   */
  private async generateSummary(
    results: AnalysisResult[],
    helpText: string,
  ): Promise<void> {
    await summary
      .addHeading('Dependency Analysis Results')
      .addTable(this.createTable(results))
      .addDetails('Troubleshooting', helpText)
      .write();
  }

  /**
   * Builds the rows of the job summary table, including a header row.
   * @param results - The analysis results to render as rows.
   * @returns The table rows, starting with the header row.
   * @example
   * const rows = this.createTable(results);
   */
  private createTable(results: AnalysisResult[]): SummaryTableRow[] {
    const tableHeader: SummaryTableRow = [
      { data: 'Status', header: true },
      { data: 'Dependency', header: true },
      { data: 'Version', header: true },
      { data: 'Category', header: true },
      { data: 'Optional', header: true },
      { data: 'Location', header: true },
      { data: 'Artifactory', header: true },
    ];

    const tableRows: SummaryTableRow[] = results.map((result) => {
      const line = result.position ? result.position.line : 1;
      const link = SummaryFormatter.generateGitHubLink(result.sourceFile, line);
      return [
        {
          data:
            result.status === DependencyStatus.UNUSED
              ? '<img alt="View" src="https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/remdep.svg" /> Dependency declared but potentially unused'
              : '<img alt="View" src="https://raw.githubusercontent.com/mridang/action-dependency-insight/refs/heads/master/res/adddep.svg" /> Dependency referenced but is undeclared',
        },
        { data: `<code>${result.dependency.name}</code>` },
        { data: result.dependency.version || '(n/a)' },
        { data: result.category },
        { data: result.optional ? '✓' : '' },
        {
          data: `<a href="${link}">${result.sourceFile}:${line}</a>`,
        },
        {
          data: `<center><a href="${result.extra.link}"><img alt="View" src="${result.extra.icon}" /></a></center>`,
        },
      ];
    });

    return [tableHeader, ...tableRows];
  }

  /**
   * Generates a permanent GitHub link to a specific line in a file for the
   * current workflow's commit SHA.
   * @param filePath - The path to the file from the repository root.
   * @param line - The 1-based line number to link to.
   * @returns A fully qualified URL to the file line.
   * @throws Error when the workflow context lacks the server URL, repository owner, name or commit SHA.
   * @example
   * const url = SummaryFormatter.generateGitHubLink('package.json', 4);
   */
  private static generateGitHubLink(filePath: string, line: number): string {
    const {
      serverUrl,
      repo: { owner, repo: name },
      sha,
    } = new ContextCtor();

    if (!serverUrl || !owner || !name || !sha) {
      throw new Error(
        'Missing required context values: serverUrl, owner, repo, or sha',
      );
    }

    return `${serverUrl}/${owner}/${name}/blob/${sha}/${filePath}#L${line}`;
  }
}
