import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@omoikane/application/message',
              message: 'Use relative imports.',
            },
          ],
          patterns: [
            {
              group: ['@omoikane/application/message/*'],
              message:
                'Deep imports through the public package alias are forbidden.',
            },
          ],
        },
      ],
    },
  },
];
