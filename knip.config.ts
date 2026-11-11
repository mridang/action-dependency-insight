/**
 * Knip configuration that scopes unused-dependency analysis for this repository.
 * @file
 */
export default {
  ignore: ['test/checkers/**'],
  ignoreDependencies: [/^@semantic-release\//, 'semantic-release-major-tag'],
};
