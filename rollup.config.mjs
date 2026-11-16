/**
 * Rollup configuration that bundles the action into a single CommonJS file.
 * @file
 */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'node:module';
import json from '@rollup/plugin-json';

const NODE_BUILTINS = builtinModules.flatMap((name) => [name, `node:${name}`]);

/** Matches the `node_modules` folder in a module id. */
const NODE_MODULES_PATH = /node_modules/;

/**
 * Builds the Rollup options for the action, with optional overrides for the
 * TypeScript plugin.
 * @param {object} [configOverrides] - Settings merged into the TypeScript plugin options.
 * @returns {Omit<import('rollup').RollupOptions, 'output'> & { output: import('rollup').OutputOptions }} The Rollup input, output, plugin and external options.
 * @example
 * export default createRollupConfig({ typescript: { sourceMap: true } });
 */
const createRollupConfig = (configOverrides = {}) => ({
  input: 'src/main.ts',
  output: {
    file: 'dist/main.cjs',
    format: 'cjs',
    sourcemap: true,
    inlineDynamicImports: true,
    interop: (id) => {
      // For Node.js built-in modules (e.g., 'buffer', 'fs/promises'):
      // Return 'default' to ensure they are treated as pure CommonJS modules,
      // without extra '.default' wrappers, matching Node.js's native behavior.
      if (NODE_BUILTINS.includes(id)) {
        return 'default'; // CHANGED from `false` to `'default'`
      }
      // For all other modules (e.g., 'jwt-decode'), return 'esModule' to ensure
      // they get the `__esModule: true` flag, allowing `import Foo from 'foo'` to work.
      return 'esModule';
    },
  },
  onwarn(warning, warn) {
    switch (warning.code) {
      case 'CIRCULAR_DEPENDENCY':
      case 'THIS_IS_UNDEFINED': {
        return;
      }
      default: {
        warn(warning);
      }
    }
  },
  plugins: [
    json({
      preferConst: true,
      compact: true,
    }),
    resolve({
      exportConditions: ['node', 'default'],
      preferBuiltins: true,
    }),
    commonjs({
      include: NODE_MODULES_PATH,
      requireReturnsDefault: (id) => {
        if (id.includes('jwt-decode')) {
          return true;
        }
        return 'auto';
      },
      ignore: NODE_BUILTINS,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      ...configOverrides.typescript,
    }),
  ],
  external: NODE_BUILTINS,
});

export default createRollupConfig;
