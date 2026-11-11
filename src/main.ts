/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 * @file
 */
import { run } from './index.js';

/* istanbul ignore next */
// noinspection JSUnusedGlobalSymbols
// eslint-disable-next-line unicorn/prefer-top-level-await -- the CJS bundle cannot use top-level await
export default (async () => {
  await run();
})();
