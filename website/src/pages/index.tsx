import type { ReactNode } from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import githubStyles from '@internal/docusaurus-theme/github-button.module.css';
import styles from '@internal/docusaurus-theme/hero.module.css';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';

import { OutdatedAnimation } from '../components/OutdatedAnimation';

import pageStyles from './index.module.css';

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

const Home = (): ReactNode => {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout>
      <main>
        <header className={`${styles.hero} ${pageStyles.hero}`}>
          <div className={`${styles.heroContent} ${pageStyles.heroContent}`}>
            <div className={pageStyles.heroTop}>
              <div className={pageStyles.heroText}>
                <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
                <p className={styles.heroTagline}>{OPENER}</p>
              </div>
              <div className={styles.heroActions}>
                <Link className={githubStyles.githubButton} to="/docs">
                  Get Started
                </Link>
              </div>
            </div>
            <div className={`${styles.heroInstall} ${pageStyles.install}`}>
              <CodeBlock language="bash">npx -y @ladamczyk/outdated</CodeBlock>
            </div>
          </div>
        </header>
        <OutdatedAnimation />
        <ul className={`${styles.features} ${pageStyles.features}`}>
          {FEATURES.map(({ title, description }) => (
            <li key={title} className={`${styles.feature} ${pageStyles.feature}`}>
              <h2 className={styles.featureTitle}>{title}</h2>
              <p className={styles.featureDescription}>{description}</p>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
};

export default Home;
