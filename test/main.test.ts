/**
 * Integration tests that bundle the action with Rollup, load the bundle into a
 * vm context and check the outcome written to the job summary.
 * @file
 */
import { describe, expect, test } from '@jest/globals';
import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
// noinspection ES6PreferShortImport
import { withTempDir } from './helpers/with-temp-dir.js';
import { withEnvVars } from './helpers/with-env-vars.js';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import vm, { constants as VM } from 'node:vm';
import { rollup } from 'rollup';
import createRollupConfig from '../rollup.config.mjs';
import jwt from 'jsonwebtoken';

/**
 * Bundle the project using the local rollup.config.mjs and write the output
 * to "<outputDir>/.test-bundles/bundle-<timestamp>.cjs".
 * Returns the absolute path to the generated bundle so tests can load it
 * with `readFile`, `vm.runInContext`, etc.
 * @returns Absolute path of the generated CommonJS bundle.
 * @example
 * const bundlePath = await bundleToPath();
 */
export async function bundleToPath(): Promise<string> {
  const testConfig = createRollupConfig({
    typescript: {
      // eslint-disable-next-line sonarjs/no-undefined-assignment -- an explicit undefined stops the plugin from validating the default dist outDir against the temp bundle
      outDir: undefined,
      declaration: false,
      sourceMap: true,
    },
  });

  const bundle = await rollup(testConfig);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'test-bundle-'));
  const outputFile = path.join(tempDir, `bundle-${Date.now()}.cjs`);

  await copyFile(
    path.join(process.cwd(), 'tsconfig.json'),
    path.join(tempDir, 'tsconfig.json'),
  );
  try {
    await bundle.write({ ...testConfig.output, file: outputFile });
  } finally {
    await bundle.close();
  }

  return outputFile;
}

/**
 * A test helper to execute the main action script (`run`) within a
 * controlled environment. It simulates the GitHub Actions runtime by
 * preparing environment variables and mocking necessary features like
 * Job Summaries.
 * @param inputs - A record of key-value pairs representing the action's
 * inputs, equivalent to the `with` block in a workflow YAML file.
 * @param extraEnv - A record of additional environment variables to set
 * during the action's execution, used to simulate workflow context
 * like `GITHUB_REF` or `GITHUB_EVENT_NAME`.
 * @param eventPayload - The GitHub event payload written to the event file.
 * @returns A promise that resolves with the summary written by the action.
 * @example
 * const { summary } = await runAction({ 'working-directory': tmp }, {}, {});
 */
async function runAction(
  inputs: Record<string, string>,
  extraEnv: Record<string, string | undefined> = {},
  eventPayload: unknown = {},
): Promise<{ summary: string }> {
  const summaryDir = await mkdtemp(path.join(tmpdir(), 'test-'));
  const summaryPath = path.join(summaryDir, 'summary.md');
  await writeFile(summaryPath, '');

  const eventDir = await mkdtemp(path.join(tmpdir(), 'test-'));
  const eventPath = path.join(eventDir, 'event.json');
  await writeFile(eventPath, JSON.stringify(eventPayload));

  const env = {
    ...extraEnv,
    ...Object.fromEntries(
      Object.entries(inputs).map(([key, value]) => [
        `INPUT_${key.replaceAll(' ', '_').toUpperCase()}`,
        value,
      ]),
    ),
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_STEP_SUMMARY: summaryPath,
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'owner/repo',
    GITHUB_SHA: '03ab23e',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_RUN_ID: '1',
    ACTIONS_STEP_DEBUG: '1',
    RUNNER_DEBUG: '1',
    ACTIONS_RUNTIME_TOKEN: jwt.sign(
      {
        scp: 'Actions.Results:some-run-id:some-job-id',
      },
      'dummy-secret',
    ),
    ACTIONS_RESULTS_URL: 'https://results.local:8080',
  };

  try {
    const wrappedRun = withEnvVars(env, async () => {
      const actionScript = await bundleToPath();
      const script = await readFile(actionScript, 'utf8');

      const context = {
        ...process.env,
        require: createRequire(import.meta.url),
        global: {},
        __filename: actionScript,
        __dirname: path.dirname(actionScript),
        module: { exports: {} },
      };
      Object.defineProperties(
        context,
        Object.getOwnPropertyDescriptors(globalThis),
      );
      vm.createContext(context);
      // eslint-disable-next-line sonarjs/code-eval -- the test deliberately runs the bundled action inside a vm context
      const result = vm.runInContext(script, context, {
        filename: actionScript,
        importModuleDynamically: VM.USE_MAIN_CONTEXT_DEFAULT_LOADER,
      }) as unknown;

      await result;
      return '';
    });
    await wrappedRun();
  } finally {
    //
  }

  const summaryContent = await readFile(summaryPath, 'utf8');
  return { summary: summaryContent };
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
      await writeFile(
        path.join(tmp, 'package.json'),
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
            GITHUB_WORKSPACE: tmp,
            GITHUB_EVENT_NAME: params.event.name,
            GITHUB_REPOSITORY: 'test-owner/test-repo',
          },
          params.event.payload,
        );

      await (params.expectToThrow
        ? expect(action()).rejects.toThrow(params.expectedErrorMessage)
        : expect(action()).resolves.not.toThrow());
    })();
  });
});
