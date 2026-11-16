/**
 * A small ES module program used as the Knip fixture. It uses the axios package,
 * which is declared in the fixture's package.json.
 * @file
 */

// eslint-disable-next-line import/no-unresolved, e18e/ban-dependencies -- axios is declared in the fixture's package.json and only installed inside the Docker image; the fixture must import axios so Knip can detect it
import axios from 'axios';

console.log('Hello from Node.js!');
const response = await axios.get('https://httpbin.org/get');
console.log(response.status);
