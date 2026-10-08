import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { createInterface } from 'readline/promises';

import { sendStats as send, STATS_URL, PIXEL_URL } from '@ladamczyk/qoq-utils';
import c from 'picocolors';

// Machine-wide, not per-project: outdated has no config file of its own, and
// asking once per checkout would be one prompt per repo. XDG_CONFIG_HOME wins
// where it is set, ~/.config otherwise.
const CONSENT_FILE = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'),
  'outdated.json'
);

const readConsent = (file: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    // Missing or corrupt is the same as never asked.
    return {};
  }
};

const writeConsent = (file: string, stats: boolean): void => {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify({ ...readConsent(file), stats }, null, 2)}\n`);
  } catch {
    // An unwritable config dir means we ask again next run — not an error worth
    // failing a lint over.
  }
};

const askConsent = async (): Promise<boolean> => {
  process.stdout.write(
    [
      c.bold('\nOutdated usage stats\n'),
      `Send a count of outdated runs to ${STATS_URL}? Each run posts one thing:\n`,
      `  • the tool name — always the literal ${c.cyan('"outdated"')}\n`,
      c.gray(`Blocked POST? The same values go to ${PIXEL_URL} as a GET.\n`),
      c.gray(
        'Never sent: your dependencies, package.json, paths, versions, findings,\n' +
          'the flags you typed, project or package names, and nothing identifying\n' +
          'you or your machine.\n'
      ),
      c.gray(`Stored as \`stats: true|false\` in ${CONSENT_FILE} — edit it any time.\n\n`),
    ].join('')
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return (await rl.question('Send anonymous usage stats? [y/N] ')).trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
};

// Three states, and they are not two: `true` allows, `false` denies, and
// `undefined` means nobody has been asked yet. A non-interactive run (CI, a
// pipe, `npx … | tee`) can't ask, so it stays undefined — nothing is sent and
// nothing is written, and the next run with a human present still prompts.
// Answering `false` writes that denial down, which is what stops the asking.
export const resolveConsent = async (file: string = CONSENT_FILE): Promise<boolean | undefined> => {
  const stored = readConsent(file).stats;

  if (typeof stored === 'boolean') {
    return stored;
  }

  if (process.env.CI === 'true' || !process.stdin.isTTY || !process.stdout.isTTY) {
    return undefined;
  }

  const stats = await askConsent();

  writeConsent(file, stats);

  return stats;
};

// Transport — both endpoints, the shared 2s cap, the swallowed failures — is
// qoq-utils', so a URL changes in one place for every tool that counts runs; all
// that is bound here is the name.
//
// No `options` argument, and none passed: a run count is the whole question this
// answers. Nothing about how the run was invoked goes out, so there is nothing
// to sanitize.
export const sendStats = async (): Promise<void> => send('outdated');
