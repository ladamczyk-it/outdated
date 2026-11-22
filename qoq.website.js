// One qoq per repo: the root qoq.config.js spreads this in, the website has no linter of its own.
export const websiteEslint = [
  {
    template: 'qoq-eslint-v9-ts-react',
    files: ['website/src/**/*.{ts,tsx}', 'website/docusaurus.config.ts'],
    rules: {
      // Docusaurus theme/runtime aliases are virtual webpack modules backed only by
      // ambient `declare module` types (@docusaurus/module-type-aliases), so no real
      // file exists for import-x's resolver to find.
      'import-x/no-unresolved': [
        2,
        { ignore: ['^@docusaurus/', '^@theme/', '^@theme-original/', '^@generated/'] },
      ],
    },
  },
];
