import type { ReactNode } from 'react';

import styles from './styles.module.css';

/**
 * Captured from `outdated` on a demo project, 2026-11-23, with the packages below
 * (npm facts as of that day). Default output: problem rows only, footer counts all.
 * Last publish is the date alone; the CLI's relative age would go stale on a static page.
 */
const PROMPT = '$ npx -y @ladamczyk/outdated';

const ROWS = [
  {
    name: 'request',
    current: '2.88.2',
    wanted: '2.88.2',
    latest: '2.88.2',
    lastPublish: '2020-02-11',
    // The CLI truncates deprecation messages to 60 characters.
    flags: [
      {
        text: 'deprecated request has been deprecated, see https://github.com/request…',
        className: styles.deprecated,
      },
      { text: 'stale', className: styles.stale },
    ],
  },
  {
    name: 'ms',
    current: '2.1.3',
    wanted: '2.1.3',
    latest: '2.1.3',
    lastPublish: '2020-12-08',
    flags: [{ text: 'stale', className: styles.stale }],
  },
  {
    name: 'chalk',
    current: '4.1.2',
    wanted: '4.1.2',
    latest: '6.0.1',
    lastPublish: '2026-09-27',
    // Major bump: Latest is red; the name is yellow because wanted equals current.
    outdated: true,
    majorBump: true,
    nameClass: styles.yellow,
    flags: [{ text: 'outdated', className: styles.outdated }],
  },
  {
    name: 'picocolors',
    current: '1.1.1',
    wanted: '1.1.1',
    latest: '1.1.1',
    lastPublish: '2024-10-16',
    flags: [{ text: 'stale', className: styles.stale }],
  },
];

const SUMMARY = [
  { text: '6 packages', className: undefined },
  { text: '1 deprecated', className: styles.deprecated },
  { text: '3 stale', className: styles.stale },
  { text: '1 outdated', className: styles.outdated },
  { text: '0 unknown', className: styles.unknown },
  { text: '0 blocked', className: styles.blocked },
  { text: '2 ok', className: styles.ok },
];

const LABEL =
  'Animation: outdated runs over a project, prints a table of its problem packages with a flag for each, and a summary line.';

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
          <div className={styles.prompt}>{PROMPT}</div>
          <div className={styles.output}>
            <div className={`${styles.row} ${styles.header}`}>
              <span>Package</span>
              <span className={styles.right}>Current</span>
              <span className={styles.right}>Wanted</span>
              <span className={styles.right}>Latest</span>
              <span>Depended by</span>
              <span>Last publish</span>
              <span>Links</span>
              <span>Flags</span>
            </div>
            <div className={styles.section}>dependencies (4)</div>
            {ROWS.map(
              ({
                name,
                current,
                wanted,
                latest,
                lastPublish,
                outdated,
                majorBump,
                nameClass,
                flags,
              }) => (
                <div key={name} className={styles.row}>
                  <span className={nameClass}>{name}</span>
                  <span className={styles.right}>{current}</span>
                  <span className={outdated ? `${styles.right} ${styles.wanted}` : styles.right}>
                    {wanted}
                  </span>
                  <span
                    className={majorBump ? `${styles.right} ${styles.majorBump}` : styles.right}
                  >
                    {latest}
                  </span>
                  <span className={styles.muted}>demo</span>
                  <span>{lastPublish}</span>
                  <span>npm / repo</span>
                  <span>
                    {flags.map(({ text, className }, i) => (
                      <span key={text}>
                        {i > 0 && ' '}
                        <span className={className}>{text}</span>
                      </span>
                    ))}
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
    </div>
  </section>
);
