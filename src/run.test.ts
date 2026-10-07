import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { EExitCode } from '@ladamczyk/qoq-utils';
import cac from 'cac';
import { afterEach, describe, expect, it } from 'vitest';

import pkg from '../package.json' with { type: 'json' };

import { run } from './run.ts';

import type { ICheckResult, IPackageResult, TRunner } from './types.ts';

const NOW = new Date('2026-06-15T00:00:00.000Z');
const RECENT = '2026-06-01T00:00:00.000Z';
const OLD = '2025-05-15T00:00:00.000Z'; // 13 months before NOW
const EIGHT_MONTHS = '2025-10-15T00:00:00.000Z';

const dirs: string[] = [];

const parse = (stdout: string): ICheckResult => JSON.parse(stdout) as ICheckResult;

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const project = (manifest: Record<string, unknown> | null): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outdated-run-'));
  dirs.push(dir);
  if (manifest) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
  }
  return dir;
};

const view = (published = RECENT, deprecated?: string): string =>
  JSON.stringify({
    'dist-tags': { latest: '1.0.0' },
    time: { '1.0.0': published },
    ...(deprecated === undefined ? {} : { deprecated }),
  });

const fakeRunner =
  (opts: { views?: Record<string, string>; outdated?: string; calls?: string[][] } = {}): TRunner =>
  (args) => {
    opts.calls?.push([...args]);
    if (args[0] === 'outdated') {
      return Promise.resolve(opts.outdated ?? '{}');
    }
    return Promise.resolve(opts.views?.[String(args[1])] ?? view());
  };

const exec = (argv: string[], dir: string, runner: TRunner = fakeRunner()) =>
  run(['--cwd', dir, ...argv], { runner, now: NOW });

const mixed = (): { dir: string; runner: TRunner } => ({
  dir: project({ dependencies: { aa: '1.0.0', bb: '1.0.0', cc: '1.0.0', dd: '1.0.0' } }),
  runner: fakeRunner({
    outdated: JSON.stringify({ cc: { current: '0.9.0', wanted: '1.0.0', latest: '1.0.0' } }),
    views: { bb: view(OLD), cc: view(), dd: view(RECENT, 'gone') },
  }),
});

const expectFailure = (result: Awaited<ReturnType<typeof run>>): void => {
  expect(result.code).toBe(EExitCode.EXCEPTION);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('✖');
};

describe('run output', () => {
  it('json mode', async () => {
    const { dir, runner } = mixed();
    const result = await exec(['--json'], dir, runner);
    const parsed = parse(result.stdout);

    expect(result.code).toBe(EExitCode.OK);
    expect(parsed.schemaVersion).toBe(1);
    expect(Object.keys(parsed)).toStrictEqual(
      expect.arrayContaining(['packages', 'summary', 'skipped'])
    );
    expect(result.stdout).not.toContain('\u001b');
    expect(result.stderr).toBe('');
  });

  it('table mode order', async () => {
    const { dir, runner } = mixed();
    const { stdout } = await exec([], dir, runner);
    const at = (name: string): number => stdout.search(new RegExp(`^${name} `, 'm'));

    expect(at('dd')).toBeGreaterThan(0);
    expect([at('dd'), at('bb'), at('cc'), at('aa')]).toStrictEqual(
      [at('dd'), at('bb'), at('cc'), at('aa')].toSorted((a, b) => a - b)
    );
    expect(stdout).not.toContain('"schemaVersion"');
  });

  it('only-problems affects table only', async () => {
    const { dir, runner } = mixed();
    const json = parse((await exec(['--only-problems', '--json'], dir, runner)).stdout);
    const table = (await exec(['--only-problems'], dir, runner)).stdout;

    expect(json.packages.map((p: Pick<IPackageResult, 'name'>) => p.name)).toContain('aa');
    expect(table).not.toMatch(/^aa /m);
    expect(table).toMatch(/^bb /m);
  });
});

describe('run exit codes', () => {
  it('fail-on exit codes', async () => {
    const { dir, runner } = mixed();
    const clean = project({ dependencies: { aa: '1.0.0' } });

    expect((await exec(['--fail-on', 'stale'], dir, runner)).code).toBe(EExitCode.ERROR);
    expect((await exec([], dir, runner)).code).toBe(EExitCode.OK);
    expect((await exec(['--fail-on', 'stale'], clean)).code).toBe(EExitCode.OK);
  });

  it.each([
    ['--fail-on', 'bogus'],
    ['--stale-after', '0'],
    ['--stale-after', '1.5'],
    ['--stale-after', 'abc'],
    ['--include', 'x'],
    ['--concurrency', '0'],
    ['--nope'],
  ])('invalid options exit 2: %j', async (...argv) => {
    expectFailure(await exec(argv, project({ dependencies: { aa: '1.0.0' } })));
  });

  it('missing package.json exits 2', async () => {
    const result = await exec([], project(null));

    expectFailure(result);
    expect(result.stderr).toContain('package.json');
  });

  it('npm outdated failure exits 2', async () => {
    const dir = project({ dependencies: { aa: '1.0.0' } });
    const result = await run(['--cwd', dir], { runner: () => Promise.resolve(''), now: NOW });

    expectFailure(result);
  });
});

describe('run options', () => {
  it('options reach check', async () => {
    const calls: string[][] = [];
    let live = 0;
    let peak = 0;
    const dir = project({
      dependencies: { a: '1.0.0', b: '1.0.0', p1: '1.0.0', p2: '1.0.0', p3: '1.0.0', p4: '1.0.0' },
      devDependencies: { young: '1.0.0', old: '1.0.0' },
    });
    const views: Record<string, string> = { young: view(EIGHT_MONTHS), old: view(OLD) };
    const base = fakeRunner({ views, calls });
    const runner: TRunner = async (args) => {
      if (args[0] !== 'view') {
        return base(args);
      }
      live += 1;
      peak = Math.max(peak, live);
      await sleep(5);
      live -= 1;
      return base(args);
    };
    const args = ['--include', 'dev,prod', '--ignore', 'a,b', '--concurrency', '3'];
    const result = await exec([...args, '--stale-after', '12', '--json'], dir, runner);
    const stale = parse(result.stdout).packages.filter((p) => p.stale);
    const queried = calls.filter((c) => c[0] === 'view').map((c) => c[1]);

    expect(queried).not.toContain('a');
    expect(queried).not.toContain('b');
    expect(queried).toContain('young');
    expect(peak).toBe(3);
    expect(stale.map((p: Pick<IPackageResult, 'name'>) => p.name)).toStrictEqual(['old']);
  });

  it('include excludes other dependency types from lookups', async () => {
    const calls: string[][] = [];
    const dir = project({
      dependencies: { prodpkg: '1.0.0' },
      devDependencies: { devpkg: '1.0.0' },
    });
    await exec(['--include', 'dev'], dir, fakeRunner({ calls }));

    expect(calls.map((c) => c[1])).toContain('devpkg');
    expect(calls.map((c) => c[1])).not.toContain('prodpkg');
  });
});

describe('run help and version', () => {
  it.each([['-h'], ['--help']])('help and version: %s lists every option', async (flag) => {
    const result = await run([flag]);

    expect(result.code).toBe(EExitCode.OK);
    for (const name of [
      '--cwd',
      '--stale-after',
      '--include',
      '--ignore',
      '--concurrency',
      '--json',
      '--only-problems',
      '--fail-on',
    ]) {
      expect(result.stdout).toContain(name);
    }
  });

  it.each([['-v'], ['--version']])('help and version: %s prints the version', async (flag) => {
    expect(await run([flag])).toStrictEqual({
      stdout: `${pkg.version}\n`,
      stderr: '',
      code: EExitCode.OK,
    });
  });
});

describe('cac option keys', () => {
  it('cac option keys are accepted', async () => {
    const cli = cac('outdated')
      .option('--stale-after <months>', 'x')
      .option('--only-problems', 'x')
      .option('--fail-on <list>', 'x');
    const { options } = cli.parse(
      ['node', 'outdated', '--stale-after', '3', '--only-problems', '--fail-on', 'stale'],
      { run: false }
    );
    const dir = project({ dependencies: { aa: '1.0.0' } });
    const result = await exec(['--stale-after', '3', '--only-problems', '--fail-on', 'stale'], dir);

    expect(Object.keys(options).toSorted()).toStrictEqual(
      ['--', 'failOn', 'onlyProblems', 'staleAfter'].toSorted()
    );
    expect(result.code).toBe(EExitCode.OK);
    expect(result.stderr).toBe('');
  });
});
