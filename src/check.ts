import { basename, dirname, relative, resolve, sep } from 'path';

import {
  readDeps,
  readWorkspaces,
  findInstalled,
  type IDepEntry,
  type IWorkspace,
} from './deps.ts';
import { parseOutdated, parseView, type IOutdatedEntry, type TViewResult } from './npm.ts';
import { mapPool } from './pool.ts';
import { createNpmRunner } from './runner.ts';
import { addMonths } from './time.ts';

import type {
  ICheckOptions,
  ICheckResult,
  IPackageResult,
  ISummary,
  TDepType,
  TFlag,
  TRunner,
} from './types.ts';

const ALL_TYPES: readonly TDepType[] = ['prod', 'dev', 'optional'];

interface IContext {
  root: string;
  runner: TRunner;
  timeoutMs: number;
  now: Date;
  staleAfterMonths: number;
}

const major = (version: string | null): number | null => {
  const match = /^v?(\d+)/.exec(version ?? '');
  return match ? Number(match[1]) : null;
};

const isMajorBump = (current: string | null, latest: string | null): boolean => {
  const from = major(current);
  const to = major(latest);
  return from !== null && to !== null && to > from;
};

const withTimeout = async (work: Promise<string>, ms: number): Promise<string> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`npm view timed out after ${ms}ms`));
    }, ms);
  });
  try {
    // ponytail: a timed-out child cannot be killed; it runs on, only its result is dropped.
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const lookup = async (name: string, ctx: IContext): Promise<TViewResult> => {
  const args = [
    'view',
    name,
    'time',
    'dist-tags',
    'deprecated',
    'engines',
    'repository',
    '--json',
    '--prefix',
    ctx.root,
  ];
  try {
    return parseView(await withTimeout(ctx.runner(args), ctx.timeoutMs));
  } catch (error) {
    return { unknown: error instanceof Error ? error.message : String(error) };
  }
};

const outdatedKey = (entry: IDepEntry): string =>
  entry.queriedName === null ? entry.name : `${entry.name}:${entry.specifier.replace(/^npm:/, '')}`;

// Mirrors @npmcli/name-from-folder: npm outdated's `dependent` for a scoped folder is `@scope/base`.
const folderName = (dir: string): string => {
  const parent = basename(dirname(dir));
  return parent.startsWith('@') ? `${parent}/${basename(dir)}` : basename(dir);
};

// ponytail: dependent is a folder basename, so two workspaces with the same folder name (apps/utils,
// libs/utils) can't be told apart and the first match wins; tie-break on hit.location under ws.dir if it matters.
const findHit = (hits: IOutdatedEntry[] | undefined, ws: IWorkspace): IOutdatedEntry | undefined =>
  hits?.find((h) => h.dependent === null || h.dependent === folderName(ws.dir));

// npm outdated resolves "latest" with the running Node's engines in mind. When the registry's
// latest differs from what npm settled on (the installed version if it isn't listed), the newer
// release needs a different Node. A deprecated latest is skipped by npm for another reason.
const isBlocked = (
  latest: string | null,
  viewed: { deprecated: string | null; latestNode: string | null } | null,
  hit: IOutdatedEntry | undefined,
  current: string | null
): boolean => {
  const npmLatest = hit ? hit.latest : current;

  return (
    viewed !== null &&
    viewed.latestNode !== null &&
    viewed.deprecated === null &&
    latest !== null &&
    npmLatest !== null &&
    npmLatest !== latest
  );
};

const flagsFor = (row: Omit<IPackageResult, 'flags'>, blocked: boolean): TFlag[] => {
  const flags: TFlag[] = [];
  if (row.deprecated !== null) {
    flags.push('deprecated');
  }
  if (row.stale) {
    flags.push('stale');
  }
  if (row.outdated) {
    flags.push('outdated');
  }
  if (row.unknown !== null) {
    flags.push('unknown');
  }
  if (blocked) {
    flags.push('blocked');
  }
  return flags.length > 0 ? flags : ['ok'];
};

const buildRow = (
  entry: IDepEntry,
  ws: IWorkspace,
  view: TViewResult,
  hit: IOutdatedEntry | undefined,
  ctx: IContext
): IPackageResult => {
  const viewed = 'latest' in view ? view : null;
  const installed = findInstalled([...new Set([ws.dir, ctx.root])], entry.name);
  const current = hit?.current ?? installed?.version ?? null;
  const latest = viewed?.latest ?? hit?.latest ?? null;
  const published = viewed ? new Date(viewed.lastPublish) : null;
  const outdated = hit !== undefined;
  const partial = {
    workspace: ws.name,
    location: installed
      ? relative(ctx.root, installed.path).split(sep).join('/')
      : `node_modules/${entry.name}`,
    name: entry.name,
    queriedName: entry.queriedName,
    type: entry.type,
    specifier: entry.specifier,
    current,
    wanted: hit?.wanted ?? null,
    latest,
    outdated,
    majorBump: outdated && isMajorBump(current, latest),
    deprecated: viewed?.deprecated ?? null,
    latestNode: viewed?.latestNode ?? null,
    repository: viewed?.repository ?? null,
    lastPublish: published ? published.toISOString() : null,
    stale: published !== null && published < addMonths(ctx.now, -ctx.staleAfterMonths),
    unknown: 'unknown' in view ? view.unknown : null,
  };
  return { ...partial, flags: flagsFor(partial, isBlocked(latest, viewed, hit, current)) };
};

const summarise = (packages: IPackageResult[], skipped: number): ISummary => {
  const count = (flag: TFlag): number => packages.filter((p) => p.flags.includes(flag)).length;
  return {
    total: packages.length,
    deprecated: count('deprecated'),
    stale: count('stale'),
    outdated: count('outdated'),
    unknown: count('unknown'),
    blocked: count('blocked'),
    ok: count('ok'),
    skipped,
  };
};

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name < b.name ? -1 : Number(a.name > b.name);

export const check = async (options: ICheckOptions = {}): Promise<ICheckResult> => {
  const root = resolve(options.cwd ?? process.cwd());
  const staleAfterMonths = options.staleAfterMonths ?? 6;
  const now = options.now ?? new Date();
  const runner = options.runner ?? createNpmRunner();
  const ctx: IContext = {
    root,
    runner,
    timeoutMs: options.timeoutMs ?? 30_000,
    now,
    staleAfterMonths,
  };
  const depOptions = { include: options.include ?? ALL_TYPES, ignore: options.ignore ?? [] };

  const members = readWorkspaces(root);
  const workspaceNames = new Set(members.map((w) => w.name));
  const rootDeps = readDeps(root, { ...depOptions, workspaceNames });
  const { project } = rootDeps;
  const workspaces = [
    { ws: { name: project, dir: root }, ...rootDeps },
    ...members.map((ws) => ({ ws, ...readDeps(ws.dir, { ...depOptions, workspaceNames }) })),
  ];
  const outdated = parseOutdated(await runner(['outdated', '--json', '--prefix', root]));

  const queried = new Set(
    workspaces.flatMap(({ entries }) =>
      entries.filter((e) => e.validName).map((e) => e.queriedName ?? e.name)
    )
  );
  const views = new Map(
    await mapPool([...queried], options.concurrency ?? 6, async (name) => {
      return [name, await lookup(name, ctx)] as const;
    })
  );

  // invalid names never reach `queried`, so a missing view means an invalid name
  const packages = workspaces.flatMap(({ ws, entries }) =>
    entries.map((entry) =>
      buildRow(
        entry,
        ws,
        views.get(entry.queriedName ?? entry.name) ?? { unknown: 'invalid package name' },
        findHit(outdated[outdatedKey(entry)], ws),
        ctx
      )
    )
  );
  const skipped = workspaces.flatMap((w) => w.skipped.sort(byName));

  return {
    schemaVersion: 2,
    generatedAt: now.toISOString(),
    staleAfterMonths,
    project,
    workspaces: workspaces.map((w) => w.ws.name),
    packages,
    summary: summarise(packages, skipped.length),
    skipped,
  };
};
