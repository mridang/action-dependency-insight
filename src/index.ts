/**
 * The main logic of the GitHub Action. It detects which checkers apply to the
 * project, runs them, and reports the findings to the job summary and console.
 * @file
 */
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
import { context } from '@actions/github';

type Context = typeof context;
const ContextCtor = context.constructor as new () => Context;

/**
 * Retrieves the working directory from the action's 'working-directory' input.
 * @returns The specified working directory or the current process's
 * working directory if the input is empty.
 * @example
 * const projectDir = getWorkingDirectory();
 */
function getWorkingDirectory(): string {
  const dir = getInput('working-directory').trim();
  return dir || process.cwd();
}

/**
 * Sets the action's failure status with a given message.
 * In a JEST test environment, it throws an error instead of calling
 * `actionFailed`.
 * @param message - The error message or Error object.
 * @throws The message wrapped in an Error when running under Jest.
 * @example
 * setFailed('Could not detect a supported project type.');
 */
function setFailed(message: string | Error): void {
  if (process.env.JEST_WORKER_ID) {
    throw message instanceof Error ? message : new Error(message);
  } else {
    actionFailed(message);
  }
}

const summaryFormatter = new SummaryFormatter();
const consoleFormatter = new ConsoleFormatter();

/**
 * The main entry point for the action.
 * @param [_ghCtx] - The GitHub context object, injectable for tests.
 * @returns A promise that resolves once the checks have run and the outcome
 * has been reported.
 * @example
 * await run();
 */
// noinspection JSUnusedLocalSymbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars -- the context parameter is injectable for tests and otherwise unused
export async function run(_ghCtx: Context = new ContextCtor()): Promise<void> {
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      setFailed(error);
    } else {
      setFailed(error as string);
    }
  }
}
