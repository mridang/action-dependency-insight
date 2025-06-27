import { AnalysisResult, Position } from './types.js';

/**
 * An interface for strategies that find the exact line and column of a
 * dependency declaration within a manifest file.
 */
export interface IPositionDeducer {
  /**
   * Finds the line and column of a dependency in a given manifest file.
   * @param manifestPath The full path to the manifest file.
   * @param dependencyName The name of the dependency to find.
   * @returns A Position object, or null if not found.
   */
  findDependencyPosition(
    manifestPath: string,
    dependencyName: string,
  ): Position | null;
}

/**
 * The core interface that all language-specific checkers must implement.
 */
export interface IDependencyChecker {
  /**
   * The user-friendly name of the checker.
   */
  readonly name: string;

  /**
   * The primary manifest file this checker looks for to identify a project.
   */
  readonly manifestFile: string;

  /**
   * Runs the dependency analysis for a given project path.
   * @param projectPath The absolute path to the project's root directory.
   * @param deducer A strategy for finding the exact line/column of deps.
   * @param debug
   * @returns An array of analysis results.
   */
  run(
    projectPath: string,
    deducer: IPositionDeducer,
    debug: boolean,
  ): AnalysisResult[];
}

/**
 * The core interface for formatting analysis results for output.
 */
export interface IFormatter {
  /**
   * Formats and outputs the analysis results.
   * @param results The array of analysis results to format.
   */
  format(results: AnalysisResult[]): Promise<void>;
}
