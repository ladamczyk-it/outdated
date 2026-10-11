import dotenv from 'dotenv';

dotenv.config({ path: ['./.env.local'] });

export default {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    [
      '@semantic-release/git',
      {
        // No [skip ci] (the plugin default): the tag must reach Woodpecker to trigger cv's docs sync.
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
      },
    ],
    '@semantic-release/github',
  ],
  ci: false,
};
