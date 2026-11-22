import type { ReactNode } from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from '@internal/docusaurus-theme/hero.module.css';
import Layout from '@theme/Layout';

// Placeholder homepage: replace it in every Tool.
const Home = (): ReactNode => {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout>
      <main>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
            <p className={styles.heroTagline}>{siteConfig.tagline}</p>
            <div className={styles.heroActions}>
              <Link className="button button--primary button--lg" to="/docs">
                Read the docs
              </Link>
            </div>
          </div>
        </header>
      </main>
    </Layout>
  );
};

export default Home;
