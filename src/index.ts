import {
  info,
  setFailed as actionFailed,
  startGroup,
  endGroup,
  getInput,
  isDebug,
} from '@actions/core';
import { IPositionDeducer } from './interfaces.js';
import { AnalysisResult } from './types.js';
import { PackageJsonDeducer } from './deducers/package-json.js';
import { ComposerJsonDeducer } from './deducers/composer-json.js';
import { PyprojectTomlDeducer } from './deducers/pyproject-toml.js';
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
 * @param {Context} [ghCtx=new Context()] - The GitHub context object.
 */
// noinspection JSUnusedLocalSymbols
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function run(ghCtx = new Context()): Promise<void> {
  try {
    const workingDirectory = getWorkingDirectory();
    info(`Analyzing project at: ${workingDirectory}`);

    const selectedCheckers = getCheckersForProject(workingDirectory);

    if (selectedCheckers.length === 0) {
      setFailed('Could not detect a supported project type.');
      return;
    }

    let allResults: AnalysisResult[] = [];

    for (const checker of selectedCheckers) {
      startGroup(`Running ${checker.name}`);
      let positionDeducer: IPositionDeducer | null = null;
      switch (checker.manifestFile) {
        case 'package.json':
          positionDeducer = new PackageJsonDeducer();
          break;
        case 'composer.json':
          positionDeducer = new ComposerJsonDeducer();
          break;
        case 'pyproject.toml':
          positionDeducer = new PyprojectTomlDeducer();
          break;
      }

      if (positionDeducer) {
        const results = checker.run(
          workingDirectory,
          positionDeducer,
          isDebug(),
        );
        allResults = [...allResults, ...results];
      }
      endGroup();
    }

    await summaryFormatter.format(allResults);
    await consoleFormatter.format(allResults);

    if (allResults.length > 0) {
      setFailed(
        `Found ${allResults.length} unused or undeclared dependencies.`,
      );
    } else {
      info('No unused or undeclared dependencies found.');
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      setFailed(err);
    } else {
      setFailed(err as string);
    }
  }
}
