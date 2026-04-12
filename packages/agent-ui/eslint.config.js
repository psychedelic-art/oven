// @ts-check
/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@mui/*'],
              message:
                '@oven/agent-ui must not depend on MUI. Use @oven/oven-ui + Tailwind cn() instead.',
            },
            {
              group: ['react-router-dom'],
              message:
                '@oven/agent-ui must not depend on react-router-dom. Use framework-agnostic routing.',
            },
            {
              group: ['apps/**', 'apps/*'],
              message:
                'Packages must not import from apps/. Use a shared package instead.',
            },
          ],
        },
      ],
    },
  },
];
