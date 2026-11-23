import type { ReactNode } from 'react';

import { HomePage } from '@internal/docusaurus-theme/HomePage';

import { OutdatedAnimation } from '../components/OutdatedAnimation';

const FEATURES = [
  {
    title: 'Beyond outdated',
    description:
      "Deprecation, last publish date and staleness sit next to npm outdated's own columns, plus npm and repo links.",
  },
  {
    title: 'Built for CI',
    description:
      '--fail-on turns stale, deprecated or outdated into exit code 1, and --json follows a versioned schema.',
  },
  {
    title: 'Workspaces aware',
    description:
      'An npm workspaces root gets one block per workspace, with one npm view per package across all of them.',
  },
];

const OPENER =
  "npm outdated tells you what's behind. Outdated also tells you what's deprecated, what hasn't shipped in months and what your Node can't run — in the same table, or as JSON your CI can fail on.";

const Home = (): ReactNode => (
  <HomePage features={FEATURES} install="npx -y @ladamczyk/outdated" opener={OPENER}>
    <OutdatedAnimation />
  </HomePage>
);

export default Home;
