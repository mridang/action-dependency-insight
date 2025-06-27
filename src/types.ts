/**
 * Represents a location (line, column) within a source file.
 * @property {number} line - The 1-based line number.
 * @property {number} column - The 1-based column number.
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * The status of a dependency finding.
 */
export enum DependencyStatus {
  UNUSED = 'UNUSED',
  UNDECLARED = 'UNDECLARED',
}

/**
 * The category of a dependency (e.g., runtime vs. development).
 */
export enum DependencyCategory {
  RUNTIME = 'runtime',
  DEVELOPMENT = 'development',
  UNKNOWN = 'unknown',
}

/**
 * Represents a single dependency finding.
 * @property {string} name - The name of the package.
 * @property {string} [version] - The optional version of the package.
 */
interface Dependency {
  name: string;
  version?: string;
}

/**
 * The standardized structure for a single analysis result.
 * Every checker must map its tool's output to this structure.
 */
export interface AnalysisResult {
  status: DependencyStatus;
  category: DependencyCategory;
  dependency: Dependency;
  sourceFile: string;
  position?: Position;
  optional?: boolean;
}
