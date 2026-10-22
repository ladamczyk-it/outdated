import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findInstalled, readDeps, readWorkspaces } from './deps.ts';

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

const installCopy = (dir: string, name: string, version: string): void => {
  const folder = path.join(dir, 'node_modules', name);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ version }));
};

describe('readDeps workspaceNames', () => {
  const workspaceNames = new Set(['api']);

  it('skips a dep named like a workspace package', () => {
    const cwd = project({ dependencies: { api: '^1.0.0', other: '^1' } });
    const { entries, skipped } = readDeps(cwd, { ...all, workspaceNames });
    expect(entries.map((e) => e.name)).toStrictEqual(['other']);
    expect(skipped.map((s) => [s.name, s.reason])).toStrictEqual([['api', 'workspace package']]);
  });

  it('prefers workspace package over unsupported specifier', () => {
    const cwd = project({ dependencies: { api: 'file:../api' } });
    const { entries, skipped } = readDeps(cwd, { ...all, workspaceNames });
    expect(entries).toStrictEqual([]);
    expect(skipped.map((s) => s.reason)).toStrictEqual(['workspace package']);
  });
});

describe('readWorkspaces', () => {
  const make = (root: string, rel: string, pkg: unknown): string => {
    const dir = path.join(root, rel);
    fs.mkdirSync(dir, { recursive: true });
    if (pkg !== undefined) {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
    }
    return dir;
  };

  it('returns sorted workspaces with absolute dirs', () => {
    const root = project({ workspaces: ['packages/*'] });
    make(root, 'packages/b', { name: 'b' });
    make(root, 'packages/a', { name: 'a' });
    expect(readWorkspaces(root)).toStrictEqual([
      { name: 'a', dir: path.join(root, 'packages/a') },
      { name: 'b', dir: path.join(root, 'packages/b') },
    ]);
  });

  it('ignores folders without package.json', () => {
    const root = project({ workspaces: ['packages/*'] });
    make(root, 'packages/a', { name: 'a' });
    make(root, 'packages/empty', undefined);
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['a']);
  });

  it('accepts the { packages } form', () => {
    const root = project({ workspaces: { packages: ['packages/*'] } });
    make(root, 'packages/a', { name: 'a' });
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['a']);
  });

  it('honours negated patterns', () => {
    const root = project({ workspaces: ['packages/*', '!packages/legacy'] });
    make(root, 'packages/a', { name: 'a' });
    make(root, 'packages/legacy', { name: 'legacy' });
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['a']);
  });

  it('processes patterns in order and dedupes', () => {
    const root = project({ workspaces: ['tools/x', 'packages/*', 'packages/a'] });
    make(root, 'packages/a', { name: 'a' });
    make(root, 'tools/x', { name: 'x' });
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['x', 'a']);
  });

  it('falls back to folder basename without a name', () => {
    const root = project({ workspaces: ['packages/*'] });
    make(root, 'packages/noname', {});
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['noname']);
  });

  it('returns [] without valid workspaces', () => {
    expect(readWorkspaces(project({}))).toStrictEqual([]);
    expect(readWorkspaces(project({ workspaces: 'x' }))).toStrictEqual([]);
  });

  it('never returns anything under node_modules', () => {
    const root = project({ workspaces: ['**'] });
    make(root, 'packages/a', { name: 'a' });
    make(root, 'node_modules/dep', { name: 'dep' });
    expect(readWorkspaces(root).map((w) => w.name)).toStrictEqual(['a']);
  });
});

describe('findInstalled', () => {
  it('prefers the first dir that has the package', () => {
    const root = project({});
    const ws = project({});
    installCopy(root, 'ms', '1.0.0');
    installCopy(ws, 'ms', '2.0.0');
    expect(findInstalled([ws, root], 'ms')).toStrictEqual({
      path: path.join(ws, 'node_modules', 'ms'),
      version: '2.0.0',
    });
  });

  it('falls back to the later dir', () => {
    const root = project({});
    const ws = project({});
    installCopy(root, 'ms', '1.0.0');
    expect(findInstalled([ws, root], 'ms')).toStrictEqual({
      path: path.join(root, 'node_modules', 'ms'),
      version: '1.0.0',
    });
  });

  it('returns null when neither has it', () => {
    expect(findInstalled([project({}), project({})], 'ms')).toBeNull();
  });

  it.each(['{}', '{"version":1}'])('returns version null for %s', (body) => {
    const dir = project({});
    const folder = path.join(dir, 'node_modules', 'ms');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'package.json'), body);
    expect(findInstalled([dir], 'ms')).toStrictEqual({ path: folder, version: null });
  });

  it('treats an unparseable package.json as not found and falls through', () => {
    const bad = project({});
    const good = project({});
    const folder = path.join(bad, 'node_modules', 'ms');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'package.json'), 'not json');
    installCopy(good, 'ms', '3.0.0');
    expect(findInstalled([bad], 'ms')).toBeNull();
    expect(findInstalled([bad, good], 'ms')?.version).toBe('3.0.0');
  });
});
