import { getNoRestrictedImportsPaths } from '@ladamczyk/qoq-eslint-v9-js';

const rules = {
  'no-restricted-imports': [1, { paths: getNoRestrictedImportsPaths() }],
};

export default {
  stats: true,
  prettier: { sources: ['.'] },
  knip: {
    entry: ['./src/index.{js,ts}', './src/cli.{js,ts}'],
    project: './src/**/*.{js,ts}',
    ignore: ['**/rolldown.config.js', '**/vitest.config.js', 'eslint.config.js', 'qoq.config.js'],
    ignoreDependencies: ['rolldown', 'dotenv', '@commitlint/cli'],
  },
  eslint: [{ template: 'qoq-eslint-v9-ts', files: ['src/**/*.ts'], rules }],
};
