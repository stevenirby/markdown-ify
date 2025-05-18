// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Add specific script directory rules
  {
    files: ['scripts/**/*.js', 'scripts/**/*.ts', 'webpack.config.js'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off',
    }
  },
  prettier
);