import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { check } from './check.ts';
import * as api from './index.ts';

import type { ICheckOptions, ICheckResult, IPackageResult, TFlag, TRunner } from './types.ts';

const NOW = new Date('2026-06-15T00:00:00.000Z');
const RECENT = '2026-06-01T00:00:00.000Z';
const OLD = '2025-10-15T00:00:00.000Z'; // 8 months before NOW

type TView = string | (() => Promise<string>);

interface IFake {
  outdated?: string;
  views?: Record<string, TView>;
  onView?: (name: string) => Promise<void>;
}

const dirs: string[] = [];

const neverSettles = (): Promise<string> =>
  new Promise<string>(() => {
    // never settles
  });

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const project = (deps: Record<string, string>, installed: Record<string, string> = {}): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outdated-check-'));
  dirs.push(dir);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps }));
  for (const [name, version] of Object.entries(installed)) {
    fs.mkdirSync(path.join(dir, 'node_modules', name), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'node_modules', name, 'package.json'),
      JSON.stringify({ version })
    );
  }
  return dir;
};

const viewJson = (opts: {
  latest?: string;
  published?: string;
  modified?: string;
  deprecated?: string;
  node?: string;
}): string =>
  JSON.stringify({
    'dist-tags': { latest: opts.latest ?? '1.0.0' },
    time: { modified: opts.modified ?? RECENT, [opts.latest ?? '1.0.0']: opts.published ?? RECENT },
    ...(opts.deprecated === undefined ? {} : { deprecated: opts.deprecated }),
    ...(opts.node === undefined ? {} : { engines: { node: opts.node } }),
  });

const outdatedJson = (entries: Record<string, Record<string, string>>): string =>
  JSON.stringify(entries);

const fake = (spec: IFake, calls: string[][] = []): TRunner => {
  return async (args) => {
    calls.push([...args]);
    if (args[0] === 'outdated') {
      return spec.outdated ?? '{}';
    }
    const name = String(args[1]);
    await spec.onView?.(name);
    const view = spec.views?.[name] ?? viewJson({});
    return typeof view === 'function' ? view() : view;
  };
};

const run = (
  dir: string,
  spec: IFake,
  extra: Partial<ICheckOptions> = {},
  calls: string[][] = []
): Promise<ICheckResult> => check({ cwd: dir, runner: fake(spec, calls), now: NOW, ...extra });

const row = (result: ICheckResult, name: string): IPackageResult => {
  const found = result.packages.find((p) => p.name === name);
  if (!found) {
    throw new Error(`no row for ${name}`);
  }
  return found;
};

const names = (result: ICheckResult): string[] => result.packages.map((p) => p.name);
const flagsOf = (result: ICheckResult, name: string): string[] => row(result, name).flags;

describe('check classification', () => {
  it('classifies and keeps package.json order', async () => {
    const dir = project({
      'c-stale': '1.0.0',
      'aa-ok': '1.0.0',
      'd-dep': '1.0.0',
      'b-out': '1.0.0',
    });
    const result = await run(dir, {
      outdated: outdatedJson({ 'b-out': { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' } }),
      views: {
        'b-out': viewJson({ latest: '1.1.0' }),
        'c-stale': viewJson({ published: OLD }),
        'd-dep': viewJson({ deprecated: 'use something else' }),
      },
    });

    expect(names(result)).toStrictEqual(['c-stale', 'aa-ok', 'd-dep', 'b-out']);
    expect(result.packages.map((p) => p.flags)).toStrictEqual([
      ['stale'],
      ['ok'],
      ['deprecated'],
      ['outdated'],
    ]);
    expect(row(result, 'd-dep').deprecated).toBe('use something else');
    expect(row(result, 'c-stale').lastPublish).toBe(OLD);
  });

  it('flags are not mutually exclusive', async () => {
    const dir = project({ both: '1.0.0' });
    const result = await run(dir, {
      views: { both: viewJson({ published: OLD, deprecated: 'gone' }) },
    });

    expect(flagsOf(result, 'both')).toStrictEqual(['deprecated', 'stale']);
  });

  it('absent from outdated is ok; future date is ok', async () => {
    const dir = project({ plain: '1.0.0', future: '1.0.0' });
    const result = await run(dir, {
      views: { future: viewJson({ published: '2027-01-01T00:00:00.000Z' }) },
    });

    expect(flagsOf(result, 'plain')).toStrictEqual(['ok']);
    expect(flagsOf(result, 'future')).toStrictEqual(['ok']);
    expect(row(result, 'future').unknown).toBeNull();
    expect(row(result, 'plain').outdated).toBe(false);
  });

  it('ignores time.modified', async () => {
    const dir = project({ old: '1.0.0' });
    const result = await run(dir, {
      views: { old: viewJson({ published: OLD, modified: RECENT }) },
    });

    expect(row(result, 'old').stale).toBe(true);
  });

  it('majorBump', async () => {
    const dir = project({ big: '1.9.0', small: '1.0.0' });
    const result = await run(dir, {
      outdated: outdatedJson({
        big: { current: '1.9.0', wanted: '1.9.0', latest: '2.0.0' },
        small: { current: '1.0.0', wanted: '1.9.0', latest: '1.9.0' },
      }),
      views: { big: viewJson({ latest: '2.0.0' }), small: viewJson({ latest: '1.9.0' }) },
    });

    expect(row(result, 'big').majorBump).toBe(true);
    expect(row(result, 'small').majorBump).toBe(false);
    expect(row(result, 'small').wanted).toBe('1.9.0');
  });
});

describe('check failures', () => {
  it('view failure yields unknown without aborting', async () => {
    const dir = project({ rej: '1', hang: '1', junk: '1', e404: '1', fine: '1' });
    const result = await run(
      dir,
      {
        views: {
          rej: () => Promise.reject(new Error('spawn failed')),
          hang: neverSettles,
          junk: 'not json',
          e404: JSON.stringify({ error: { code: 'E404', summary: 'Not found' } }),
        },
      },
      { timeoutMs: 20 }
    );

    for (const name of ['rej', 'hang', 'junk', 'e404']) {
      expect(typeof row(result, name).unknown).toBe('string');
      expect(flagsOf(result, name)).toContain('unknown');
    }
    expect(row(result, 'e404').unknown).toContain('E404');
    expect(flagsOf(result, 'fine')).toStrictEqual(['ok']);
  });

  it('outdated and unknown together', async () => {
    const dir = project({ pkg: '1.0.0' });
    const result = await run(dir, {
      outdated: outdatedJson({ pkg: { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' } }),
      views: { pkg: 'not json' },
    });

    expect(flagsOf(result, 'pkg')).toStrictEqual(['outdated', 'unknown']);
  });

  it('outdated failure rejects, empty object succeeds', async () => {
    const dir = project({ pkg: '1.0.0' });

    await expect(run(dir, { outdated: '' })).rejects.toThrow(/empty output/);
    await expect(run(dir, { outdated: 'nope' })).rejects.toThrow(/invalid JSON/);
    await expect(run(dir, { outdated: '{}' })).resolves.toHaveProperty('schemaVersion', 1);
  });

  it('invalid names are never queried', async () => {
    const dir = project({ 'Bad Name': '1.0.0' });
    const calls: string[][] = [];
    const result = await run(dir, {}, {}, calls);

    expect(row(result, 'Bad Name').unknown).toBe('invalid package name');
    expect(calls.filter((c) => c[0] === 'view')).toStrictEqual([]);
  });
});

describe('check runner interaction', () => {
  it('runner receives the contracted arguments', async () => {
    const dir = project({ one: '1.0.0', two: '1.0.0' });
    const calls: string[][] = [];
    await run(dir, {}, {}, calls);

    expect(calls.filter((c) => c[0] === 'outdated')).toStrictEqual([
      ['outdated', '--json', '--prefix', dir],
    ]);
    const views = calls.filter((c) => c[0] === 'view').sort((a, b) => (a[1]! < b[1]! ? -1 : 1));
    expect(views).toStrictEqual([
      [
        'view',
        'one',
        'time',
        'dist-tags',
        'deprecated',
        'engines',
        'repository',
        '--json',
        '--prefix',
        dir,
      ],
      [
        'view',
        'two',
        'time',
        'dist-tags',
        'deprecated',
        'engines',
        'repository',
        '--json',
        '--prefix',
        dir,
      ],
    ]);
  });

  it('honours concurrency', async () => {
    const dir = project({ a: '1', b: '1', c: '1', d: '1', e: '1' });
    let active = 0;
    let max = 0;
    await run(
      dir,
      {
        onView: async () => {
          active += 1;
          max = Math.max(max, active);
          await sleep(10);
          active -= 1;
        },
      },
      { concurrency: 2 }
    );

    expect(max).toBe(2);
  });

  it('alias query and outdated key', async () => {
    const dir = project({ pc: 'npm:picocolors@1.0.0' });
    const calls: string[][] = [];
    const result = await run(
      dir,
      {
        outdated: outdatedJson({
          'pc:picocolors@1.0.0': { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' },
        }),
        views: { picocolors: viewJson({ latest: '1.1.0' }) },
      },
      {},
      calls
    );

    expect(calls.some((c) => c[0] === 'view' && c[1] === 'picocolors')).toBe(true);
    expect(row(result, 'pc').queriedName).toBe('picocolors');
    expect(flagsOf(result, 'pc')).toStrictEqual(['outdated']);
  });
});

describe('check results', () => {
  it('current and latest fallbacks', async () => {
    const dir = project({ inst: '1', bare: '1' }, { inst: '1.2.3' });
    const result = await run(dir, {
      outdated: outdatedJson({ inst: { wanted: '1.2.3', latest: '3.0.0' } }),
      views: { inst: 'not json', bare: 'not json' },
    });

    expect(row(result, 'inst').current).toBe('1.2.3');
    expect(row(result, 'inst').latest).toBe('3.0.0');
    expect(row(result, 'bare').current).toBeNull();
    expect(row(result, 'bare').latest).toBeNull();
  });

  it('flags blocked when the latest release needs another node', async () => {
    const NODE = '^22.18 || >= 24';
    const dir = project(
      { listed: '1', quiet: '1', same: '1', dep: '1', bare: '1' },
      { quiet: '9.0.2', same: '10.0.1', dep: '9.0.2', bare: '9.0.2' }
    );
    const result = await run(dir, {
      // npm settled on 9.0.2 for `listed` (outdated) and, by not listing the others, on current
      outdated: outdatedJson({
        listed: { current: '9.0.0', wanted: '9.0.2', latest: '9.0.2' },
      }),
      views: {
        listed: viewJson({ latest: '10.0.1', node: NODE }),
        quiet: viewJson({ latest: '10.0.1', node: NODE }),
        same: viewJson({ latest: '10.0.1', node: NODE }),
        dep: viewJson({ latest: '10.0.1', node: NODE, deprecated: 'gone' }),
        bare: viewJson({ latest: '10.0.1' }),
      },
    });

    expect(flagsOf(result, 'listed')).toStrictEqual(['outdated', 'blocked']);
    expect(flagsOf(result, 'quiet')).toStrictEqual(['blocked']);
    expect(row(result, 'quiet').latestNode).toBe(NODE);
    expect(row(result, 'quiet').latest).toBe('10.0.1');
    expect(flagsOf(result, 'same')).toStrictEqual(['ok']);
    expect(row(result, 'same').latestNode).toBe(NODE);
    expect(flagsOf(result, 'dep')).toStrictEqual(['deprecated']);
    expect(flagsOf(result, 'bare')).toStrictEqual(['ok']);
    expect(row(result, 'bare').latestNode).toBeNull();
    expect(result.summary.blocked).toBe(2);
  });

  it('summary and envelope', async () => {
    const dir = project({
      ok: '1',
      both: '1',
      out: '1',
      outunk: '1',
      local: 'file:../x',
    });
    const result = await run(dir, {
      outdated: outdatedJson({
        out: { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' },
        outunk: { current: '1.0.0', wanted: '1.0.0', latest: '1.1.0' },
      }),
      views: {
        both: viewJson({ published: OLD, deprecated: 'x' }),
        out: viewJson({ latest: '1.1.0' }),
        outunk: 'not json',
      },
    });
    const count = (flag: TFlag): number =>
      result.packages.filter((p) => p.flags.includes(flag)).length;
    const { summary } = result;

    expect(result.schemaVersion).toBe(1);
    expect(result.generatedAt).toBe(NOW.toISOString());
    expect(result.staleAfterMonths).toBe(6);
    expect(summary.total).toBe(result.packages.length);
    expect(summary.skipped).toBe(result.skipped.length);
    expect(summary).toStrictEqual({
      total: 4,
      deprecated: count('deprecated'),
      blocked: count('blocked'),
      stale: count('stale'),
      outdated: count('outdated'),
      unknown: count('unknown'),
      ok: count('ok'),
      skipped: 1,
    });
    expect(summary.deprecated).toBeGreaterThanOrEqual(1);
    expect(summary.stale).toBeGreaterThanOrEqual(1);
    expect(summary.outdated).toBeGreaterThanOrEqual(1);
    expect(summary.unknown).toBeGreaterThanOrEqual(1);
    const flagTotal =
      summary.deprecated + summary.stale + summary.outdated + summary.unknown + summary.ok;
    expect(flagTotal).toBeGreaterThan(summary.total);
    expect(result.skipped.map((s) => s.name)).toStrictEqual(['local']);
  });
});

describe('check public API', () => {
  it('public API exports check', () => {
    expect(api.check).toBe(check);
    expect('format' in api).toBe(false);
  });
});
