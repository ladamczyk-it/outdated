import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const readmePath = resolve(process.cwd(), 'README.md');
const readme = readFileSync(readmePath, 'utf-8');

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('README', () => {
  it('has the required sections', () => {
    const headings = ['Usage', 'Options', 'Exit codes', 'JSON schema'];
    for (const heading of headings) {
      const pattern = new RegExp(`^#{1,6}\\s+${heading}\\s*$`, 'im');
      expect(readme).toMatch(pattern);
    }
  });

  it('documents every flag', () => {
    const flags = [
      '--cwd',
      '--stale-after',
      '--include',
      '--ignore',
      '--concurrency',
      '--json',
      '--only-problems',
      '--fail-on',
      '--help',
      '--version',
    ];
    for (const flag of flags) {
      const escaped = escapeRegex(flag);
      const pattern = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
      expect(readme).toMatch(pattern);
    }
  });

  it('caveat and time.modified rationale', () => {
    expect(readme).toMatch(/signal,\s+not\s+a\s+verdict/i);
    expect(readme).toMatch(/time\.modified/);
  });

  it('schema version and Windows note', () => {
    expect(readme).toMatch(/schemaVersion/);
    expect(readme).toMatch(/Windows/);
  });
});
