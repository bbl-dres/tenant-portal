// ESLint flat config — correctness-focused, not stylistic. Replaces the
// former scripts/verify/check-js-syntax.mjs (`node --check` caught parse
// errors only; this also catches undefined variables, bad import names,
// unreachable code, etc.). Run via `npm run test:lint`.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    // Browser app modules (ES modules loaded by index.html).
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        maplibregl: 'readonly', // loaded from CDN in index.html
      },
    },
  },
  {
    // Node verification scripts. They also get browser globals because
    // Playwright `page.evaluate(() => …)` callbacks execute in the page
    // — document/window inside them is correct, not an error.
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    rules: {
      // Underscore-prefix opts out (matches the existing _privates style).
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // `try { … } catch {}` is the codebase's deliberate best-effort
      // idiom (map teardown, focus restore); an empty catch is fine.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
