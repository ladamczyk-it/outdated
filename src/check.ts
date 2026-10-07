import { resolve } from 'path';

import { readDeps, readInstalledVersion, type IDepEntry } from './deps.ts';
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
  cwd: string;
  runner: TRunner;
  timeoutMs: number;
  now: Date;
  staleAfterMonths: number;
  outdated: Record<string, IOutdatedEntry>;
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

const lookup = async (entry: IDepEntry, ctx: IContext): Promise<TViewResult> => {
  if (!entry.validName) {
    return { unknown: 'invalid package name' };
  }
  const args = [
    'view',
    entry.queriedName ?? entry.name,
    'time',
    'dist-tags',
    'deprecated',
    'engines',
    '--json',
    '--prefix',
    ctx.cwd,
  ];
  try {
    return parseView(await withTimeout(ctx.runner(args), ctx.timeoutMs));
  } catch (error) {
    return { unknown: error instanceof Error ? error.message : String(error) };
  }
};

const outdatedKey = (entry: IDepEntry): string =>
  entry.queriedName === null ? entry.name : `${entry.name}:${entry.specifier.replace(/^npm:/, '')}`;

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
  view: TViewResult,
  hit: IOutdatedEntry | undefined,
  ctx: IContext
): IPackageResult => {
  const viewed = 'latest' in view ? view : null;
  const current = hit?.current ?? readInstalledVersion(ctx.cwd, entry.name);
  const latest = viewed?.latest ?? hit?.latest ?? null;
  const published = viewed ? new Date(viewed.lastPublish) : null;
  const outdated = hit !== undefined;
  const partial = {
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

export const check = async (options: ICheckOptions = {}): Promise<ICheckResult> => {
  const cwd = resolve(options.cwd ?? process.cwd());
  const staleAfterMonths = options.staleAfterMonths ?? 6;
  const now = options.now ?? new Date();
  const runner = options.runner ?? createNpmRunner();
  const { project, entries, skipped } = readDeps(cwd, {
    include: options.include ?? ALL_TYPES,
    ignore: options.ignore ?? [],
  });
  const outdated = parseOutdated(await runner(['outdated', '--json', '--prefix', cwd]));
  const ctx: IContext = {
    cwd,
    runner,
    timeoutMs: options.timeoutMs ?? 30_000,
    now,
    staleAfterMonths,
    outdated,
  };

  const packages = await mapPool(entries, options.concurrency ?? 6, async (entry) =>
    buildRow(entry, await lookup(entry, ctx), outdated[outdatedKey(entry)], ctx)
  );

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    staleAfterMonths,
    project,
    packages,
    summary: summarise(packages, skipped.length),
    skipped: skipped.sort((a, b) => (a.name < b.name ? -1 : Number(a.name > b.name))),
  };
};
