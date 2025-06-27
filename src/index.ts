import {
  endGroup,
  getInput,
  info,
  isDebug,
  setFailed as actionFailed,
  startGroup,
} from '@actions/core';
import { AnalysisResult } from './types.js';
import { getCheckersForProject } from './checkers/index.js';
import { ConsoleFormatter } from './formatters/console-formatter.js';
import { SummaryFormatter } from './formatters/summary-formatter.js';
import { Context } from '@actions/github/lib/context.js';

/**
 * Retrieves the working directory from the action's 'working-directory' input.
 *
 * @returns The specified working directory or the current process's
 * working directory if the input is empty.
 */
function getWorkingDirectory(): string {
  const dir = getInput('working-directory').trim();
  if (dir) {
    return dir;
  } else {
    return process.cwd();
  }
}

/**
 * Sets the action's failure status with a given message.
 * In a JEST test environment, it throws an error instead of calling
 * `actionFailed`.
 *
 * @param message - The error message or Error object.
 */
function setFailed(message: string | Error): void {
  if (process.env.JEST_WORKER_ID) {
    if (message instanceof Error) {
      throw message;
    } else {
      throw new Error(message);
    }
  } else {
    actionFailed(message);
  }
}

const summaryFormatter = new SummaryFormatter();
const consoleFormatter = new ConsoleFormatter();

/**
 * The main entry point for the action.
 * @param {Context} [_ghCtx=new Context()] - The GitHub context object.
 */
// noinspection JSUnusedLocalSymbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function run(_ghCtx: Context = new Context()): Promise<void> {
  try {
    const workingDirectory = getWorkingDirectory();
    info(`Analyzing project at: ${workingDirectory}`);

    const selectedCheckers = getCheckersForProject(workingDirectory);

    if (selectedCheckers.length === 0) {
      setFailed('Could not detect a supported project type.');
      return;
    } else {
      let helpText: string = '';
      let allResults: AnalysisResult[] = [];

      for (const checker of selectedCheckers) {
        startGroup(`Running ${checker.name}`);
        const results = checker.run(workingDirectory, isDebug());
        allResults = [...allResults, ...results.checkResult];
        helpText = helpText + results.helpText;
        endGroup();
      }

      if (allResults.length > 0) {
        await summaryFormatter.format(allResults, helpText);
        await consoleFormatter.format(allResults, helpText);

        setFailed(
          `Found ${allResults.length} unused or undeclared dependencies.`,
        );
      } else {
        info('No unused or undeclared dependencies found.');
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      setFailed(err);
    } else {
      setFailed(err as string);
    }
  }
}
