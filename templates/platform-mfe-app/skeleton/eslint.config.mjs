import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'playwright-report',
      'test-results',
      'src/routeTree.gen.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // TanStack Router route files export a `Route` constant by design - the
  // fast-refresh rule does not apply to them.
  {
    files: ['src/routes/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Radix re-export primitives (src/components/ui), files that pair a
  // component with a hook (theme-provider, toast), and composed capability
  // modules (src/capabilities/**, same provider+hook shape - see
  // docs/capabilities.md) are library-style modules where the fast-refresh
  // rule produces only noise.
  {
    files: [
      'src/components/ui/**',
      'src/components/theme/theme-provider.tsx',
      'src/capabilities/**',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // TanStack Table's useReactTable is a documented false positive for
  // react-hooks/incompatible-library: it returns a memoized object, not
  // functions, so React Compiler's heuristic misfires. Disable for the
  // table feature module.
  {
    files: ['src/features/table-demo/**'],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
);
