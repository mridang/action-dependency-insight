/**
 * A special error thrown when a tool is not installed or configured
 * correctly. It carries a link to a help document.
 */
export class ToolConfigurationError extends Error {
  public readonly helpUrl: string;

  constructor(message: string, helpUrl: string, cause?: Error) {
    super(message, { cause });
    this.name = 'ToolConfigurationError';
    this.helpUrl = helpUrl;
  }
}
