module.exports = {
  entry: ['src/index.ts'],
  ignore: ['test/checkers/node/index.js'],
  ignoreDependencies: [
    '@semantic-release/.*?',
    '@commitlint/config-conventional',
  ],
};
