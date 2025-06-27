import { AnalysisResult, DependencyStatus } from '../types.js';
import { IFormatter } from '../interfaces.js';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Formats analysis results into a color-coded, human-readable table
 * suitable for printing directly to the console. This formatter is
 * ideal for local development and debugging workflows.
 */
export class ConsoleFormatter implements IFormatter {
  public async format(
    results: AnalysisResult[],
    helpText: string,
  ): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const outputBuilder: string[] = ['\n--- Dependency Analysis Results ---'];

    const tableLines = this.buildTable(results);
    outputBuilder.push(...tableLines);

    console.log(outputBuilder.join('\n'));
    console.log(helpText);
  }

  private buildTable(results: AnalysisResult[]): string[] {
    const tableData = results.map((r) => ({
      Status: r.status,
      Dependency: r.dependency.name,
      Version: r.dependency.version || '(n/a)',
      Category: r.category,
      Optional: r.optional ? '✓' : '',
      Location: `${r.sourceFile}${r.position ? `:${r.position.line}` : ''}`,
    }));

    const headers = Object.keys(tableData[0]);
    const columnWidths = headers.map((header) =>
      Math.max(
        header.length,
        ...tableData.map(
          (row) => (row[header as keyof typeof row] || '').length,
        ),
      ),
    );

    const headerRow = headers
      .map(
        (header, i) =>
          `${colors.white}${header.padEnd(columnWidths[i])}${colors.reset}`,
      )
      .join(' | ');

    const separatorRow = columnWidths.map((w) => '-'.repeat(w)).join('-|-');

    const bodyRows = tableData.map((row) => {
      const statusColor =
        row.Status === DependencyStatus.UNUSED ? colors.yellow : colors.red;

      return [
        `${statusColor}${row.Status.padEnd(columnWidths[0])}${colors.reset}`,
        `${colors.cyan}${row.Dependency.padEnd(columnWidths[1])}${colors.reset}`,
        (row.Version || '').padEnd(columnWidths[2]),
        (row.Category || '').padEnd(columnWidths[3]),
        (row.Optional || '').padEnd(columnWidths[4]),
        `${colors.gray}${(row.Location || '').padEnd(columnWidths[5])}${colors.reset}`,
      ].join(' | ');
    });

    return [headerRow, separatorRow, ...bodyRows];
  }
}
