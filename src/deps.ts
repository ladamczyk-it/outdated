import { readFileSync } from 'fs';
import { basename, join } from 'path';

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

export function readDeps(
  cwd: string,
  { include, ignore }: { include: readonly TDepType[]; ignore: readonly string[] }
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
  const project = typeof pkg['name'] === 'string' && pkg['name'] ? pkg['name'] : basename(cwd);
  return { project, entries, skipped };
}

export function readInstalledVersion(cwd: string, name: string): string | null {
  const version = readJson(join(cwd, 'node_modules', name, 'package.json'))?.['version'];
  return typeof version === 'string' ? version : null;
}
