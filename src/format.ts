import pc from 'picocolors';

import { relativeAge } from './time.ts';

import type { ICheckResult, IPackageResult, TDepType, TFlag } from './types.ts';

type TColors = ReturnType<typeof pc.createColors>;

// npm outdated's own columns first, ours (Last publish, Flags) at the end.
const HEADER = [
  'Package',
  'Current',
  'Wanted',
  'Latest',
  'Location',
  'Depended by',
  'Last publish',
  'Flags',
];
const RIGHT_ALIGNED = new Set([1, 2, 3]);
const SECTIONS: readonly (readonly [TDepType, string])[] = [
  ['prod', 'dependencies'],
  ['dev', 'devDependencies'],
  ['optional', 'optionalDependencies'],
];
const MAX_MESSAGE = 60;

export const formatJson = (result: ICheckResult): string => `${JSON.stringify(result, null, 2)}\n`;

const truncate = (text: string): string =>
  text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE - 1)}…` : text;

const flagText = (pkg: IPackageResult, flag: TFlag): string => {
  if (flag === 'deprecated') {
    return `deprecated ${truncate(pkg.deprecated ?? '')}`;
  }

  if (flag === 'blocked') {
    return `latest needs node ${pkg.latestNode ?? ''}`;
  }

  if (flag === 'unknown') {
    return `unknown ${pkg.unknown ?? ''}`;
  }

  return flag;
};

const publishText = (pkg: IPackageResult, now: Date): string =>
  pkg.lastPublish === null
    ? '-'
    : `${pkg.lastPublish.slice(0, 10)} (${relativeAge(pkg.lastPublish, now)})`;

const toCells = (pkg: IPackageResult, project: string, now: Date): string[] => [
  pkg.name,
  pkg.current ?? '-',
  pkg.wanted ?? pkg.current ?? '-',
  pkg.latest ?? '-',
  `node_modules/${pkg.name}`,
  project,
  publishText(pkg, now),
];

const flagColors = (c: TColors): Record<TFlag, (text: string) => string> => ({
  deprecated: c.red,
  stale: c.yellow,
  outdated: c.cyan,
  unknown: c.magenta,
  blocked: c.blue,
  ok: c.green,
});

const flagsCell = (pkg: IPackageResult, c: TColors): string => {
  const colors = flagColors(c);
  return pkg.flags.map((flag) => colors[flag](flagText(pkg, flag))).join(' ');
};

type TPaint = (text: string) => string;

// OSC 8 terminal hyperlink; the escape codes are zero-width, so padding is computed on plain text.
const hyperlink = (url: string, text: string): string =>
  `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`;

const npmUrl = (pkg: IPackageResult): string =>
  `https://www.npmjs.com/package/${pkg.queriedName ?? pkg.name}`;

const plain: TPaint = (text) => text;

const nameColor = (pkg: IPackageResult, c: TColors): TPaint => {
  if (!pkg.outdated) {
    return plain;
  }

  return pkg.current === pkg.wanted ? c.yellow : c.red;
};

const latestColor = (pkg: IPackageResult, c: TColors): TPaint => {
  if (pkg.majorBump) {
    return c.red;
  }

  return pkg.outdated ? c.magenta : plain;
};

// Same palette as npm outdated: wanted green, latest magenta, location and dependent dim.
const paints = (pkg: IPackageResult, c: TColors, links: boolean): TPaint[] => [
  links ? (text) => hyperlink(npmUrl(pkg), nameColor(pkg, c)(text)) : nameColor(pkg, c),
  plain,
  pkg.outdated ? c.green : plain,
  latestColor(pkg, c),
  c.dim,
  c.dim,
  plain,
];

// Padding sits outside the colour codes, so ANSI never skews alignment.
const renderCell = (text: string, width: number, column: number, paint: TPaint): string => {
  const gap = ' '.repeat(Math.max(0, width - text.length));

  return RIGHT_ALIGNED.has(column) ? gap + paint(text) : paint(text) + gap;
};

const renderRow = (
  pkg: IPackageResult,
  cells: string[],
  widths: number[],
  c: TColors,
  links: boolean
): string => {
  const painted = paints(pkg, c, links).map((paint, i) =>
    renderCell(cells[i] ?? '', widths[i] ?? 0, i, paint)
  );

  return [...painted, flagsCell(pkg, c)].join('  ').trimEnd();
};

const renderTable = (
  packages: IPackageResult[],
  project: string,
  now: Date,
  c: TColors,
  links: boolean
): string[] => {
  const rows = packages.map((pkg) => ({ pkg, cells: toCells(pkg, project, now) }));
  const widths = HEADER.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r.cells[i]?.length ?? 0))
  );
  const header = HEADER.map((h, i) =>
    i === HEADER.length - 1 ? h : renderCell(h, widths[i] ?? 0, i, plain)
  );
  const lines = [c.underline(c.bold(header.join('  ')))];

  // Column widths are shared across sections so every table lines up.
  for (const [type, title] of SECTIONS) {
    const section = rows.filter((r) => r.pkg.type === type);

    if (section.length > 0) {
      lines.push('', c.bold(`${title} (${section.length})`));
      lines.push(...section.map((r) => renderRow(r.pkg, r.cells, widths, c, links)));
    }
  }

  return lines;
};

const footer = (result: ICheckResult, c: TColors): string => {
  const s = result.summary;

  return [
    `${s.total} packages`,
    c.red(`${s.deprecated} deprecated`),
    c.yellow(`${s.stale} stale`),
    c.cyan(`${s.outdated} outdated`),
    c.magenta(`${s.unknown} unknown`),
    c.blue(`${s.blocked} blocked`),
    c.green(`${s.ok} ok`),
  ].join(' · ');
};

export const formatTable = (
  result: ICheckResult,
  opts: { onlyProblems: boolean; now: Date; color?: boolean | undefined }
): string => {
  const color = opts.color ?? pc.isColorSupported;
  const c = pc.createColors(color);
  const visible = opts.onlyProblems
    ? result.packages.filter((p) => !(p.flags.length === 1 && p.flags[0] === 'ok'))
    : result.packages;
  const lines =
    result.packages.length === 0
      ? ['No dependencies found']
      : renderTable(visible, result.project, opts.now, c, color);

  lines.push('', footer(result, c));

  if (result.skipped.length > 0) {
    lines.push('', c.bold('Skipped:'));
    const width = Math.max(...result.skipped.map((s) => s.name.length));
    for (const s of result.skipped) {
      lines.push(`  ${s.name.padEnd(width)}  ${s.specifier} — ${s.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
};
