import { error, summary } from '@actions/core';
import { AnalysisResult } from '../types.js';
import { IFormatter } from '../interfaces.js';

type SummaryTableRow = { data: string; header?: boolean }[];

export class SummaryFormatter implements IFormatter {
  public async format(results: AnalysisResult[]): Promise<void> {
    this.createAnnotations(results);
    await this.generateSummary(results);
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

  private async generateSummary(results: AnalysisResult[]): Promise<void> {
    summary.addHeading('Dependency Analysis Results');

    if (results.length > 0) {
      summary.addTable(this.createTable(results));
    }

    await summary.write();
  }

  private createTable(
    results: AnalysisResult[],
  ): (SummaryTableRow | string[])[] {
    const tableHeader: SummaryTableRow = [
      { data: 'Status', header: true },
      { data: 'Dependency', header: true },
      { data: 'Version', header: true },
      { data: 'Category', header: true },
      { data: 'Optional', header: true },
      { data: 'Location', header: true },
    ];

    const tableRows: string[][] = results.map((result) => [
      result.status,
      `\`${result.dependency.name}\``,
      result.dependency.version || '(n/a)',
      result.category,
      result.optional ? '✓' : '',
      `${result.sourceFile}${result.position ? `:${result.position.line}` : ''}`,
    ]);

    return [tableHeader, ...tableRows];
  }
}
