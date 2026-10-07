import pc from 'picocolors';

import { relativeAge } from './time.ts';

import type { ICheckResult, IPackageResult, TDepType, TFlag } from './types.ts';

const HEADER = ['Package', 'Type', 'Current', 'Latest', 'Last publish', 'Flags'];
const TYPE_LABELS: Record<TDepType, string> = { prod: 'dep', dev: 'dev', optional: 'opt' };
const MAX_MESSAGE = 60;

export const formatJson = (result: ICheckResult): string => `${JSON.stringify(result, null, 2)}\n`;

const truncate = (text: string): string =>
  text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE - 1)}…` : text;

const flagText = (pkg: IPackageResult, flag: TFlag): string => {
  if (flag === 'deprecated') {
    return `deprecated ${truncate(pkg.deprecated ?? '')}`;
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

const toRow = (pkg: IPackageResult, now: Date): string[] => [
  pkg.name,
  TYPE_LABELS[pkg.type],
  pkg.current ?? '-',
  pkg.latest ?? '-',
  publishText(pkg, now),
  pkg.flags.map((flag) => flagText(pkg, flag)).join(' '),
];

const LATEST_COLUMN = 3;

// Pads on plain text first, so ANSI codes never skew alignment.
const renderRow = (cells: string[], widths: number[], majorBump: boolean): string =>
  cells
    .map((cell, i) => {
      const padded = i === cells.length - 1 ? cell : cell.padEnd(widths[i] ?? 0);
      return majorBump && i === LATEST_COLUMN ? pc.red(padded) : padded;
    })
    .join('  ')
    .trimEnd();

const renderTable = (packages: IPackageResult[], now: Date): string[] => {
  const rows = packages.map((pkg) => toRow(pkg, now));
  const widths = HEADER.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]?.length ?? 0)));

  return [
    renderRow(HEADER, widths, false),
    ...rows.map((row, i) => renderRow(row, widths, packages[i]?.majorBump ?? false)),
  ];
};

const footer = (result: ICheckResult): string => {
  const s = result.summary;
  return `${s.total} packages · ${s.deprecated} deprecated · ${s.stale} stale · ${s.outdated} outdated · ${s.unknown} unknown · ${s.ok} ok`;
};

export const formatTable = (
  result: ICheckResult,
  opts: { onlyProblems: boolean; now: Date }
): string => {
  const visible = opts.onlyProblems
    ? result.packages.filter((p) => !(p.flags.length === 1 && p.flags[0] === 'ok'))
    : result.packages;
  const lines =
    result.packages.length === 0 ? ['No dependencies found'] : renderTable(visible, opts.now);

  lines.push('', footer(result));

  if (result.skipped.length > 0) {
    lines.push('', 'Skipped:');
    const width = Math.max(...result.skipped.map((s) => s.name.length));
    for (const s of result.skipped) {
      lines.push(`  ${s.name.padEnd(width)}  ${s.specifier} — ${s.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
};
