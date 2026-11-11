/**
 * Error types raised by the checkers when an external tool cannot run.
 * @file
 */

/**
 * A special error thrown when a tool is not installed or configured
 * correctly. It carries a link to a help document.
 */
export class ToolConfigurationError extends Error {
  public readonly helpUrl: string;

  /**
   * Creates an error that explains how to fix a tool's installation.
   * @param message - A human-readable description of what went wrong.
   * @param helpUrl - A link to the documentation for installing or
   * configuring the tool.
   * @param cause - The underlying error that triggered this one, if any.
   * @example
   * throw new ToolConfigurationError(
   *   '`knip` is not installed.',
   *   'https://knip.dev',
   * );
   */
  constructor(message: string, helpUrl: string, cause?: Error) {
    super(message, { cause });
    this.name = 'ToolConfigurationError';
    this.helpUrl = helpUrl;
  }
}
