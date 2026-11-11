/**
 * A small CommonJS program used as the Knip fixture. It uses the axios package,
 * which is declared in the fixture's package.json.
 * @file
 */

// eslint-disable-next-line unicorn/prefer-module, n/no-missing-require -- CommonJS fixture; axios is only installed inside the Docker image
const axios = require('axios');

/**
 * Fetches a sample URL and logs the response status.
 * @returns {Promise<void>} A promise that resolves once the request completes.
 * @example
 * await main();
 */
// eslint-disable-next-line sonarjs/declarations-in-global-scope -- CommonJS module scope, not a global
async function main() {
  console.log('Hello from Node.js!');
  const response = await axios.get('https://httpbin.org/get');
  console.log(response.status);
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- CommonJS fixture cannot use top-level await
main();
