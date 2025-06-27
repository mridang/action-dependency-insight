import { error, summary } from '@actions/core';
import { AnalysisResult, DependencyStatus } from '../types.js';
import { IFormatter } from '../interfaces.js';
import { Context } from '@actions/github/lib/context.js';

type SummaryTableRow = { data: string; header?: boolean }[];

export class SummaryFormatter implements IFormatter {
  public async format(
    results: AnalysisResult[],
    helpText: string,
  ): Promise<void> {
    this.createAnnotations(results);
    await this.generateSummary(results, helpText);
  }

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
   * @param filePath The path to the file from the repository root.
   * @param line The 1-based line number to link to.
   * @returns A fully qualified URL to the file line.
   */
  private static generateGitHubLink(filePath: string, line: number): string {
    const {
      serverUrl,
      repo: { owner, repo: name },
      sha,
    } = new Context();

    if (!serverUrl || !owner || !name || !sha) {
      throw new Error(
        'Missing required context values: serverUrl, owner, repo, or sha',
      );
    }

    return `${serverUrl}/${owner}/${name}/blob/${sha}/${filePath}#L${line}`;
  }
}
