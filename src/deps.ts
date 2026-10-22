import { globSync, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';

import type { ISkipped, TDepType } from './types.ts';

export interface IDepEntry {
  name: string;
  type: TDepType;
  specifier: string;
  queriedName: string | null;
  validName: boolean;
}

const FIELDS: readonly [TDepType, string][] = [
  ['prod', 'dependencies'],
  ['optional', 'optionalDependencies'],
  ['dev', 'devDependencies'],
]; // precedence order: first wins on dedupe

const UNSUPPORTED = ['file:', 'link:', 'workspace:', 'git+', 'git:', 'github:', 'http:', 'https:'];
const NAME_RE = /^(?:@[A-Za-z0-9~-][A-Za-z0-9._~-]*\/)?[A-Za-z0-9~-][A-Za-z0-9._~-]*$/;

const readJson = (file: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const aliasTarget = (specifier: string): string | null => {
  if (!specifier.startsWith('npm:')) {
    return null;
  }
  const rest = specifier.slice('npm:'.length);
  const at = rest.lastIndexOf('@');
  return at > 0 ? rest.slice(0, at) : rest;
};

type TSeen = Map<string, { type: TDepType; specifier: string }>;

const collect = (pkg: Record<string, unknown>, include: readonly TDepType[], seen: TSeen): void => {
  for (const [type, field] of FIELDS) {
    const deps = pkg[field];
    if (!include.includes(type) || typeof deps !== 'object' || deps === null) {
      continue;
    }
    for (const [name, specifier] of Object.entries(deps)) {
      if (!seen.has(name) && typeof specifier === 'string') {
        seen.set(name, { type, specifier });
      }
    }
  }
};

const pkgName = (pkg: Record<string, unknown>, dir: string): string =>
  typeof pkg['name'] === 'string' && pkg['name'] ? pkg['name'] : basename(dir);

export interface IWorkspace {
  name: string;
  dir: string;
}

export function readWorkspaces(root: string): IWorkspace[] {
  const field = readJson(join(root, 'package.json'))?.['workspaces'];
  // npm accepts both `workspaces: [...]` and `workspaces: { packages: [...] }`.
  const patterns = Array.isArray(field)
    ? field
    : (field as { packages?: unknown } | null | undefined)?.packages;
  if (!Array.isArray(patterns)) {
    return [];
  }
  const strings = patterns.filter((p): p is string => typeof p === 'string');
  const exclude = [
    '**/node_modules/**',
    ...strings.filter((p) => p.startsWith('!')).map((p) => `${p.slice(1)}/package.json`),
  ];
  const seen = new Set<string>();
  const out: IWorkspace[] = [];
  for (const pattern of strings.filter((p) => !p.startsWith('!'))) {
    const matches = globSync(`${pattern}/package.json`, { cwd: root, exclude }).sort();
    for (const match of matches) {
      const dir = join(root, dirname(match));
      if (dir !== root && !seen.has(dir)) {
        seen.add(dir);
        out.push({ name: pkgName(readJson(join(dir, 'package.json')) ?? {}, dir), dir });
      }
    }
  }
  return out;
}

export function readDeps(
  cwd: string,
  {
    include,
    ignore,
    workspaceNames,
  }: {
    include: readonly TDepType[];
    ignore: readonly string[];
    workspaceNames?: ReadonlySet<string>;
  }
): { project: string; entries: IDepEntry[]; skipped: ISkipped[] } {
  const file = join(cwd, 'package.json');
  const pkg = readJson(file);
  if (!pkg) {
    throw new Error(`Cannot read or parse package.json at ${file}`);
  }

  const seen: TSeen = new Map();
  collect(pkg, include, seen);

  const entries: IDepEntry[] = [];
  const skipped: ISkipped[] = [];
  for (const [name, { type, specifier }] of seen) {
    if (ignore.includes(name)) {
      continue;
    }
    if (workspaceNames?.has(name)) {
      skipped.push({ name, type, specifier, reason: 'workspace package' });
      continue;
    }
    const prefix = UNSUPPORTED.find((p) => specifier.startsWith(p));
    if (prefix) {
      skipped.push({ name, type, specifier, reason: `unsupported specifier (${prefix})` });
      continue;
    }
    const queriedName = aliasTarget(specifier);
    entries.push({
      name,
      type,
      specifier,
      queriedName,
      validName: NAME_RE.test(queriedName ?? name),
    });
  }
  return { project: pkgName(pkg, cwd), entries, skipped };
}

export function findInstalled(
  dirs: readonly string[],
  name: string
): { path: string; version: string | null } | null {
  for (const dir of dirs) {
    const path = join(dir, 'node_modules', name);
    const pkg = readJson(join(path, 'package.json'));
    if (pkg) {
      return { path, version: typeof pkg['version'] === 'string' ? pkg['version'] : null };
    }
  }
  return null;
}
