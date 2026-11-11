/**
 * A small ES module program used as the Knip fixture. It uses the axios package,
 * which is declared in the fixture's package.json.
 * @file
 */

// eslint-disable-next-line import/no-unresolved -- axios is declared in the fixture's package.json and only installed inside the Docker image
import axios from 'axios';

console.log('Hello from Node.js!');
const response = await axios.get('https://httpbin.org/get');
console.log(response.status);
