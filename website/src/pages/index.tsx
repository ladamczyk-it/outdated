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
    description:
      'check() returns the same typed result the CLI prints, so scripts and tools like qoq call it in-process.',
  },
  {
    title: 'Built for CI and AI agents',
    description:
      '--json follows a versioned schema, --fail-on turns problems into exit code 1, and JSON runs never prompt.',
  },
];

const OPENER =
  "npm outdated tells you what's behind. Outdated also tells you what's deprecated, what hasn't shipped in months and what your Node can't run — as a table, as JSON your CI or AI agent can fail on, or from JavaScript. It is also the dependency check inside qoq.";

const Home = (): ReactNode => (
  <HomePage features={FEATURES} install="npx -y @ladamczyk/outdated" opener={OPENER}>
    <Head>
      <title>{TITLE}</title>
      <meta content={DESCRIPTION} name="description" />
      <meta content={TITLE} property="og:title" />
      <meta content={DESCRIPTION} property="og:description" />
    </Head>
    <OutdatedAnimation />
    {/* The Theme's opener and features are plain strings, so the crawlable links to qoq and the AI docs live here. */}
    <section className="container margin-vert--lg">
      <p>
        Outdated runs on its own in any npm project. In{' '}
        <Link href="https://qoq.adamczyk.ovh/">qoq</Link>, the JavaScript/TypeScript quality gate,
        it is the dependency check behind <code>qoq --check</code> and the <code>/qoq bump</code>{' '}
        skill: see <Link to="/docs/qoq">Outdated in qoq</Link>. To use it as a quality gate in CI or
        from an AI coding agent, read <Link to="/docs/ai-agents-and-ci">AI agents and CI</Link>.
        Agents can start from <Link href="https://outdated.adamczyk.ovh/llms.txt">llms.txt</Link>.
      </p>
    </section>
  </HomePage>
);

export default Home;
