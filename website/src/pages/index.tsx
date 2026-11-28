import type { ReactNode } from 'react';

import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import { HomePage } from '@internal/docusaurus-theme/HomePage';

import { OutdatedAnimation } from '../components/OutdatedAnimation';

const TITLE = 'Outdated: npm dependency health check CLI and JS API';

const DESCRIPTION =
  'Find outdated, deprecated and stale npm dependencies. A CLI, a JavaScript API and versioned JSON that CI and AI agents can fail on.';

const FEATURES = [
  {
    title: 'Beyond npm outdated',
    description:
      "Deprecation, last publish date, staleness and Node-blocked releases next to npm outdated's own columns, one block per workspace.",
  },
  {
    title: 'JavaScript API',
    description: (
      <>
        check() returns the same typed result the CLI prints, so scripts and tools like{' '}
        <Link to="/docs/qoq">qoq</Link> call it in-process.
      </>
    ),
  },
  {
    title: 'Built for CI and AI agents',
    description: (
      <>
        --json follows a versioned schema, --fail-on turns problems into exit code 1, and JSON runs
        never prompt. See <Link to="/docs/ai-agents-and-ci">AI agents and CI</Link> and{' '}
        <Link href="https://outdated.adamczyk.ovh/llms.txt">llms.txt</Link>.
      </>
    ),
  },
];

const OPENER = (
  <>
    npm outdated tells you what&apos;s behind. Outdated also tells you what&apos;s deprecated, what
    hasn&apos;t shipped in months and what your Node can&apos;t run — as a table, as JSON your CI or
    AI agent can fail on, or from JavaScript. It runs on its own and is also the dependency check
    inside <Link href="https://qoq.adamczyk.ovh/">qoq</Link>.
  </>
);

const Home = (): ReactNode => (
  <HomePage
    features={FEATURES}
    heading="Outdated: npm dependency health check"
    install="npx -y @ladamczyk/outdated"
    opener={OPENER}
  >
    <Head>
      <title>{TITLE}</title>
      <meta content={DESCRIPTION} name="description" />
      <meta content={TITLE} property="og:title" />
      <meta content={DESCRIPTION} property="og:description" />
    </Head>
    <OutdatedAnimation />
  </HomePage>
);

export default Home;
