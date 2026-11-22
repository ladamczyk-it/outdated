import type { CSSProperties, ReactNode } from 'react';

import styles from './styles.module.css';

/**
 * Real npm facts (npm view, 2026-11-22). Last publish is the date of dist-tags.latest
 * without the CLI's relative age, which would go stale on a static page.
 */
const ROWS = [
  {
    name: 'request',
    current: '2.88.2',
    latest: '2.88.2',
    lastPublish: '2020-02-11',
    // The CLI truncates deprecation messages to 60 characters.
    deprecated: 'request has been deprecated, see https://github.com/request…',
    stale: true,
  },
  { name: 'ms', current: '2.1.3', latest: '2.1.3', lastPublish: '2020-12-08', stale: true },
  {
    name: 'chalk',
    current: '4.1.2',
    latest: '6.0.1',
    lastPublish: '2026-09-27',
    outdated: true,
    majorBump: true,
  },
];

/** Footer counts: 3 problem rows above plus 9 ok packages the CLI hides without --all. */
const SUMMARY = [
  { text: '12 packages', className: undefined },
  { text: '1 deprecated', className: styles.deprecated },
  { text: '2 stale', className: styles.stale },
  { text: '1 outdated', className: styles.outdated },
  { text: '0 unknown', className: styles.unknown },
  { text: '0 blocked', className: styles.blocked },
  { text: '9 ok', className: styles.ok },
];

const LABEL =
  'Animation: outdated runs over a project and flags a deprecated, a stale and an outdated dependency, then prints the summary.';

export const OutdatedAnimation = (): ReactNode => (
  <section className={styles.wrapper}>
    <div className={styles.panel} role="img" aria-label={LABEL}>
      <div aria-hidden="true">
        <div className={styles.titleBar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <div className={styles.terminal}>
          <div className={styles.prompt}>$ npx @ladamczyk/outdated</div>
          <div className={`${styles.row} ${styles.header}`}>
            <span>Package</span>
            <span className={styles.right}>Current</span>
            <span className={styles.right}>Latest</span>
            <span>Last publish</span>
            <span>Flags</span>
          </div>
          {ROWS.map(
            ({ name, current, latest, lastPublish, deprecated, stale, outdated, majorBump }, i) => (
              <div key={name} className={styles.row} style={{ '--i': i } as CSSProperties}>
                <span>{name}</span>
                <span className={styles.right}>{current}</span>
                <span className={majorBump ? `${styles.right} ${styles.majorBump}` : styles.right}>
                  {latest}
                </span>
                <span>{lastPublish}</span>
                <span className={styles.flags}>
                  {deprecated && (
                    <span className={styles.deprecated}>{`deprecated ${deprecated}`}</span>
                  )}
                  {deprecated && stale && ' '}
                  {stale && <span className={styles.stale}>stale</span>}
                  {outdated && <span className={styles.outdated}>outdated</span>}
                </span>
              </div>
            )
          )}
          <div className={styles.summary}>
            {SUMMARY.map(({ text, className }, i) => (
              <span key={text}>
                {i > 0 && ' · '}
                <span className={className}>{text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
