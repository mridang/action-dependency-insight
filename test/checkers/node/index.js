const axios = require('axios');

async function main() {
  console.log('Hello from Node.js!');
  const response = await axios.get('https://httpbin.org/get');
  console.log(response.status);
}

main();
