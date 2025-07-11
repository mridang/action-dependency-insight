import { describe, expect, test } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// noinspection ES6PreferShortImport
import { run } from '../src/index.js';
import { withTempDir } from './helpers/with-temp-dir.js';
import { withEnvVars } from './helpers/with-env-vars.js';
import { tmpdir } from 'node:os';

/**
 * A test helper to execute the main action script (`run`) within a
 * controlled environment. It simulates the GitHub Actions runtime by
 * preparing environment variables and mocking necessary features like
 * Job Summaries.
 *
 * @param inputs A record of key-value pairs representing the action's
 * inputs, equivalent to the `with` block in a workflow YAML file.
 * @param extraEnv A record of additional environment variables to set
 * during the action's execution, used to simulate workflow context
 * like `GITHUB_REF` or `GITHUB_EVENT_NAME`.
 * @param eventPayload
 * @returns A promise that resolves with the action's result or void.
 */
async function runAction(
  inputs: Record<string, string>,
  extraEnv: Record<string, string | undefined> = {},
  eventPayload: unknown,
): Promise<string | void> {
  const summaryDir = mkdtempSync(join(tmpdir(), 'test-'));
  const summaryPath = join(summaryDir, 'summary.md');
  writeFileSync(summaryPath, '');

  const eventDir = mkdtempSync(join(tmpdir(), 'test-'));
  const eventPath = join(eventDir, 'event.json');
  writeFileSync(eventPath, JSON.stringify(eventPayload));

  const wrapped = withEnvVars(
    {
      ...extraEnv,
      ...Object.fromEntries(
        Object.entries(inputs).map(([key, value]) => [
          `INPUT_${key.replace(/ /g, '_').toUpperCase()}`,
          value,
        ]),
      ),
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_EVENT_PATH: eventPath,
    },
    () => run(),
  );
  return await wrapped();
}

describe('Action Integration Tests', () => {
  const testMatrix = [
    {
      description: 'Node.js project with an unused dependency should fail',
      packageJson: {
        name: 'clean-project',
        dependencies: {
          lodash: '^4.17.21',
        },
      },
      mockedOutput:
        '{"issues":[{"file":"package.json","dependencies":[{"name":"lodash","line":4,"col":5}],"devDependencies":[]}]}',
      expectToThrow: true,
      expectedErrorMessage: 'Found 1 unused or undeclared dependencies.',
      event: { name: 'push', payload: {} },
      inputs: {},
    },
    {
      description: 'Node.js project with no unused dependencies should pass',
      packageJson: {
        name: 'clean-project',
        dependencies: {},
      },
      mockedOutput: '{"issues":[]}',
      expectToThrow: false,
      event: { name: 'push', payload: {} },
      inputs: {},
    },
  ];

  test.each(testMatrix)('$description', (params) => {
    return withTempDir(async ({ tmp }) => {
      writeFileSync(
        join(tmp, 'package.json'),
        JSON.stringify(params.packageJson),
      );

      const action = () =>
        runAction(
          {
            'github-token': 'fake-token',
            'working-directory': tmp,
            ...params.inputs,
          },
          {
            ACTIONS_STEP_DEBUG: 'true',
            GITHUB_WORKSPACE: tmp,
            GITHUB_EVENT_NAME: params.event.name,
            GITHUB_REPOSITORY: 'test-owner/test-repo',
            GITHUB_SHA: '0a2b3cd3',
          },
          params.event.payload,
        );

      if (params.expectToThrow) {
        await expect(action()).rejects.toThrow(params.expectedErrorMessage);
      } else {
        await expect(action()).resolves.not.toThrow();
      }
    })();
  });
});
