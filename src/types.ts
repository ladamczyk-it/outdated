export type TDepType = 'prod' | 'dev' | 'optional'; // == --include vocabulary
export type TProblem = 'deprecated' | 'stale' | 'outdated' | 'unknown';
export type TFlag = TProblem | 'ok'; // 'ok' iff no problem; then flags === ['ok']

// Always runs `npm <args>`. Resolves STDOUT only. Rejects on spawn failure only.
export type TRunner = (args: readonly string[]) => Promise<string>;

export interface ICheckOptions {
  cwd?: string | undefined; // default process.cwd(); resolved absolute
  staleAfterMonths?: number | undefined; // positive integer, default 6
  include?: readonly TDepType[] | undefined; // default all three
  ignore?: readonly string[] | undefined; // exact names
  concurrency?: number | undefined; // positive integer, default 6
  timeoutMs?: number | undefined; // default 30_000; library/test only, NOT a CLI flag
  runner?: TRunner | undefined; // default createNpmRunner()
  now?: Date | undefined; // default new Date()
}

export interface IPackageResult {
  name: string; // dependency key in package.json (alias key for npm: aliases)
  queriedName: string | null; // real package for npm: aliases, else null
  type: TDepType; // precedence prod > optional > dev after dedupe
  specifier: string;
  current: string | null; // outdated.current ?? node_modules/<name>/package.json version ?? null
  wanted: string | null; // outdated.wanted, else null
  latest: string | null; // view dist-tags.latest ?? outdated.latest ?? null
  outdated: boolean; // true iff the package is present in `npm outdated`
  majorBump: boolean; // outdated && latest major > current major (leading-integer regex, no semver dep)
  deprecated: string | null; // full message, never truncated in data
  lastPublish: string | null; // ISO 8601 of time[dist-tags.latest], else null
  stale: boolean; // false whenever lastPublish is null
  unknown: string | null; // reason the `npm view` lookup failed / time[latest] missing or unparseable
  flags: TFlag[]; // fixed order: deprecated, stale, outdated, unknown; or ['ok']
}

export interface ISkipped {
  name: string;
  type: TDepType;
  specifier: string;
  reason: string;
}

export interface ISummary {
  total: number; // === packages.length (excludes skipped)
  deprecated: number;
  stale: number;
  outdated: number;
  unknown: number;
  ok: number; // rows carrying the flag
  skipped: number;
}

export interface ICheckResult {
  schemaVersion: 1;
  generatedAt: string; // ISO of options.now
  staleAfterMonths: number;
  packages: IPackageResult[]; // sorted: severity (first present of deprecated, stale, outdated, unknown, ok), then name by code-point `<`
  summary: ISummary;
  skipped: ISkipped[]; // sorted by name
}
