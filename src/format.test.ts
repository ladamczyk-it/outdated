import { describe, expect, it } from 'vitest';

import { formatJson, formatTable } from './format.ts';

import type { ICheckResult, IPackageResult, ISkipped } from './types.ts';

const now = new Date('2026-03-05T00:00:00.000Z');

const pkg = (overrides: Partial<IPackageResult> = {}): IPackageResult => ({
  name: 'left-pad',
  queriedName: null,
  type: 'prod',
  specifier: '^1.0.0',
  current: '1.0.0',
  wanted: '1.0.0',
  latest: '1.0.0',
  outdated: false,
  majorBump: false,
  deprecated: null,
  lastPublish: '2026-03-01T00:00:00.000Z',
  stale: false,
  unknown: null,
  flags: ['ok'],
  ...overrides,
});

const makeResult = (packages: IPackageResult[], skipped: ISkipped[] = []): ICheckResult => ({
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  staleAfterMonths: 6,
  packages,
  summary: {
    total: packages.length,
    deprecated: packages.filter((p) => p.flags.includes('deprecated')).length,
    stale: packages.filter((p) => p.flags.includes('stale')).length,
    outdated: packages.filter((p) => p.flags.includes('outdated')).length,
    unknown: packages.filter((p) => p.flags.includes('unknown')).length,
    ok: packages.filter((p) => p.flags.includes('ok')).length,
    skipped: skipped.length,
  },
  skipped,
});

const table = (packages: IPackageResult[], onlyProblems = false, skipped: ISkipped[] = []) =>
  formatTable(makeResult(packages, skipped), { onlyProblems, now });

describe('format', () => {
  it('formatJson is the stable document', () => {
    const result = makeResult([pkg({ majorBump: true, flags: ['outdated'] })]);
    const json = formatJson(result);

    expect(json).toBe(`${JSON.stringify(result, null, 2)}\n`);
    expect(json).not.toContain('\u001b');
  });

  it('table header', () => {
    const header = table([pkg()]).split('\n')[0] ?? '';
    const positions = ['Package', 'Type', 'Current', 'Latest', 'Last publish', 'Flags'].map((h) =>
      header.indexOf(h)
    );

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toStrictEqual(positions);
  });

  it('row order and type labels', () => {
    const out = table([
      pkg({ name: 'zeta', type: 'prod' }),
      pkg({ name: 'alpha', type: 'dev', flags: ['stale'], stale: true }),
      pkg({ name: 'mid', type: 'optional' }),
    ]);
    const rows = out.split('\n').filter((l) => /^(zeta|alpha|mid)\s/.test(l));

    expect(rows.map((l) => l.split(/\s+/)[0])).toStrictEqual(['zeta', 'alpha', 'mid']);
    expect(rows[0]).toMatch(/^zeta\s+dep\s/);
    expect(rows[1]).toMatch(/^alpha\s+dev\s/);
    expect(rows[2]).toMatch(/^mid\s+opt\s/);
  });

  it('last publish with age', () => {
    expect(table([pkg({ lastPublish: '2026-01-01T00:00:00.000Z' })])).toContain(
      '2026-01-01 (2m ago)'
    );
  });

  it('null cells', () => {
    const row =
      table([pkg({ current: null, latest: null, lastPublish: null })])
        .split('\n')
        .find((l) => l.startsWith('left-pad')) ?? '';

    expect(row.split(/\s{2,}/).slice(2, 5)).toStrictEqual(['-', '-', '-']);
  });

  it('deprecation truncation', () => {
    const deprecated = (message: string) =>
      table([pkg({ deprecated: message, flags: ['deprecated'] })]);
    const exact = deprecated('x'.repeat(60));
    const over = deprecated(`${'a'.repeat(59)}bc`);

    expect(exact).toContain('x'.repeat(60));
    expect(exact).not.toContain('…');
    expect(over).toContain(`${'a'.repeat(59)}…`);
    expect(over).not.toContain('a'.repeat(60));
    expect(over).not.toContain('bc');
    expect(deprecated('use other')).toContain('use other');
  });

  it('unknown reason shown', () => {
    expect(table([pkg({ unknown: 'E404 not found', flags: ['unknown'] })])).toContain(
      'E404 not found'
    );
  });

  it('only-problems hides ok rows', () => {
    const packages = [pkg({ name: 'bad', flags: ['stale'], stale: true }), pkg({ name: 'fine' })];
    const hidden = table(packages, true);
    const shown = table(packages, false);

    expect(hidden).toContain('bad');
    expect(hidden).not.toContain('fine');
    expect(hidden).toContain('2 packages · 0 deprecated · 1 stale · 0 outdated · 0 unknown · 1 ok');
    expect(shown).toContain('fine');
  });

  it('skipped section', () => {
    const out = table([pkg()], false, [
      { name: 'local-dep', type: 'prod', specifier: 'file:../x', reason: 'local path' },
    ]);

    expect(out).toContain('Skipped:');
    expect(out).toMatch(/local-dep\s+file:\.\.\/x — local path/);
  });

  it('empty result', () => {
    const out = table([]);

    expect(out).toContain('No dependencies found');
    expect(out).not.toContain('Package');
    expect(out).toContain('0 packages');
  });
});
