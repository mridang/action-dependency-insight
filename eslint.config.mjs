import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import mridangPlugin from '@mridang/eslint-defaults';

export default [
  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url))),
  ...mridangPlugin.configs.recommended,
  {
    // eslint-plugin-sonarjs 4.2.3 reports this rule on every file, not only tests.
    rules: { 'sonarjs/no-empty-test-file': 'off' },
  },
];
