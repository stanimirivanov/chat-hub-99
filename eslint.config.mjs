import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vitest.config.*.timestamp*',
      'node_modules/**',
      '.vscode/**',
      '.idea/**',
      '**/package-lock.json',
      'libs/shared/database/src/generated/database.types.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'project:app',
              onlyDependOnLibsWithTags: [
                'layer:feature',
                'layer:application',
                'layer:infrastructure',
                'layer:domain',
                'layer:database',
                'layer:util',
              ],
            },
            {
              sourceTag: 'layer:domain',
              onlyDependOnLibsWithTags: ['layer:domain', 'layer:util'],
            },
            {
              sourceTag: 'layer:application',
              onlyDependOnLibsWithTags: [
                'layer:application',
                'layer:domain',
                'layer:util',
              ],
            },
            {
              sourceTag: 'layer:database',
              onlyDependOnLibsWithTags: ['layer:util'],
            },
            {
              sourceTag: 'layer:infrastructure',
              onlyDependOnLibsWithTags: [
                'layer:infrastructure',
                'layer:application',
                'layer:domain',
                'layer:database',
                'layer:util',
              ],
            },
            {
              sourceTag: 'layer:feature',
              onlyDependOnLibsWithTags: [
                'layer:feature',
                'layer:application',
                'layer:domain',
                'layer:util',
              ],
            },
            {
              sourceTag: 'layer:util',
              onlyDependOnLibsWithTags: ['layer:util'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
