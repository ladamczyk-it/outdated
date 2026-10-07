import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readDeps, readInstalledVersion } from './deps.ts';

const dirs: string[] = [];

const project = (pkg: unknown): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-'));
  dirs.push(dir);
  if (pkg !== undefined) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  }
  return dir;
};

const all = { include: ['prod', 'dev', 'optional'] as const, ignore: [] as string[] };

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('readDeps', () => {
  it('dedupes with prod over optional over dev', () => {
    const cwd = project({
      dependencies: { a: '^1', b: '^1' },
      devDependencies: { a: '^2', b: '^2', c: '^2' },
      optionalDependencies: { b: '^3', c: '^3' },
    });
    const { entries } = readDeps(cwd, all);
    const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
    expect(entries).toHaveLength(3);
    expect(byName['a']?.type).toBe('prod');
    expect(byName['a']?.specifier).toBe('^1');
    expect(byName['b']?.type).toBe('prod');
    expect(byName['c']?.type).toBe('optional');
  });

  it('include filters before dedupe', () => {
    const cwd = project({ dependencies: { a: '^1' }, devDependencies: { a: '^2' } });
    const { entries } = readDeps(cwd, { include: ['dev'], ignore: [] });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe('dev');
    expect(entries[0]?.specifier).toBe('^2');
  });

  it('excludes peerDependencies', () => {
    const cwd = project({ dependencies: { a: '^1' }, peerDependencies: { p: '^1' } });
    const { entries, skipped } = readDeps(cwd, all);
    expect(entries.map((e) => e.name)).toStrictEqual(['a']);
    expect(skipped).toStrictEqual([]);
  });

  it('skips unsupported specifiers', () => {
    const specs: Record<string, string> = {
      f: 'file:../f',
      l: 'link:../l',
      w: 'workspace:*',
      s: 'git+ssh://git@github.com/x/y.git',
      g: 'git://github.com/x/y.git',
      h: 'github:x/y',
      t: 'http://x.test/a.tgz',
      u: 'https://x.test/a.tgz',
    };
    const prefixes: Record<string, string> = {
      f: 'file:',
      l: 'link:',
      w: 'workspace:',
      s: 'git+',
      g: 'git:',
      h: 'github:',
      t: 'http:',
      u: 'https:',
    };
    const { entries, skipped } = readDeps(project({ dependencies: specs }), all);
    expect(entries).toStrictEqual([]);
    expect(skipped).toHaveLength(8);
    for (const s of skipped) {
      expect(s.specifier).toBe(specs[s.name]);
      expect(s.type).toBe('prod');
      expect(s.reason).toContain(prefixes[s.name]);
    }
  });

  it('parses npm aliases', () => {
    const cwd = project({
      dependencies: {
        x: 'npm:real-pkg@^1.0.0',
        y: 'npm:@scope/real@^1',
        z: 'npm:real',
        plain: '^1',
      },
    });
    const { entries } = readDeps(cwd, all);
    const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
    expect(byName['x']?.queriedName).toBe('real-pkg');
    expect(byName['y']?.queriedName).toBe('@scope/real');
    expect(byName['z']?.queriedName).toBe('real');
    expect(byName['plain']?.queriedName).toBeNull();
  });

  it('ignore omits entirely', () => {
    const cwd = project({ dependencies: { a: '^1', b: 'file:../b', c: '^1' } });
    const { entries, skipped } = readDeps(cwd, { include: ['prod'], ignore: ['b', 'a'] });
    expect(entries.map((e) => e.name)).toStrictEqual(['c']);
    expect(skipped).toStrictEqual([]);
  });

  it('flags invalid package names', () => {
    const cwd = project({ dependencies: { 'a; rm -rf x': '^1', ok: '^1', al: 'npm:bad name@1' } });
    const { entries } = readDeps(cwd, all);
    const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
    expect(byName['a; rm -rf x']?.validName).toBe(false);
    expect(byName['ok']?.validName).toBe(true);
    expect(byName['al']?.validName).toBe(false);
  });

  it('missing package.json throws', () => {
    const cwd = project(undefined);
    expect(() => readDeps(cwd, all)).toThrow(/package\.json/);
  });
});

describe('readInstalledVersion', () => {
  it('reads installed version', () => {
    const cwd = project({});
    fs.mkdirSync(path.join(cwd, 'node_modules', 'foo'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'node_modules', 'foo', 'package.json'),
      JSON.stringify({ version: '1.2.3' })
    );
    expect(readInstalledVersion(cwd, 'foo')).toBe('1.2.3');
    expect(readInstalledVersion(cwd, 'absent')).toBeNull();
  });
});
