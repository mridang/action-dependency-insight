/**
 * Contracts implemented by the checkers, position deducers and formatters.
 * @file
 */
import { AnalysisResult, Position } from './types.js';

/**
 * An interface for strategies that find the exact line and column of a
 * dependency declaration within a manifest file.
 */
export interface IPositionDeducer {
  /**
   * Finds the line and column of a dependency in a given manifest file.
   * @param manifestPath - The full path to the manifest file.
   * @param dependencyName - The name of the dependency to find.
   * @returns A promise of a Position object, or null if not found.
   */
  findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Promise<Position | null>;
}

/**
 * The core interface that all language-specific checkers must implement.
 */
export interface IDependencyChecker {
  /**
   * The primary manifest file this checker looks for to identify a project.
   */
  readonly manifestFile: string;

  /**
   * The user-friendly name of the checker.
   */
  readonly name: string;

  /**
   * Runs the dependency analysis for a given project path.
   * @param projectPath - The absolute path to the project's root directory.
   * @param debug - Whether the checker should log the raw tool output.
   * @returns A promise of the analysis results together with the help text to show.
   */
  run(
    projectPath: string,
    debug: boolean,
  ): Promise<{ checkResult: AnalysisResult[]; helpText: string }>;
}

/**
 * The core interface for formatting analysis results for output.
 */
export interface IFormatter {
  /**
   * Formats and outputs the analysis results.
   * @param results - The array of analysis results to format.
   * @param helpText - The troubleshooting guidance to include in the output.
   */
  format(results: AnalysisResult[], helpText: string): Promise<void>;
}
