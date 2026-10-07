import { EExitCode } from '@ladamczyk/qoq-utils';
import cac from 'cac';

import pkg from '../package.json' with { type: 'json' };

import { check } from './check.ts';
import { formatJson, formatTable } from './format.ts';
import { exitCodeFor, parseCliOptions } from './options.ts';

import type { TRunner } from './types.ts';

export interface IRunResult {
  stdout: string;
  stderr: string;
  code: EExitCode;
}

class HelpText extends Error {}

const buildCli = (): ReturnType<typeof cac> => {
  // cac prints help with console.info; throwing from the help callback captures the text instead.
  return cac('outdated')
    .usage('[options]')
    .help((sections) => {
      throw new HelpText(
        sections.map((s) => (s.title ? `${s.title}:\n${s.body}` : s.body)).join('\n\n')
      );
    })
    .option('-v, --version', 'Display version number')
    .option('--cwd <dir>', 'Project folder (default: current directory)')
    .option(
      '--stale-after <months>',
      'Months without a release before a package is stale (default: 6)'
    )
    .option('--include <types>', 'Dependency types to check: prod,dev,optional (default: all)')
    .option('--ignore <pkgs>', 'Comma-separated package names to skip')
    .option('--concurrency <n>', 'Parallel npm view lookups (default: 6)')
    .option('--json', 'Output machine-readable JSON')
    .option('--only-problems', 'Hide ok packages from the table')
    .option('--fail-on <list>', 'Exit 1 when any of stale,deprecated,outdated,unknown is found');
};

const execute = async (
  argv: string[],
  runner: TRunner | undefined,
  now: Date
): Promise<Pick<IRunResult, 'stdout' | 'code'>> => {
  const { options: raw } = buildCli().parse(['node', 'outdated', ...argv], { run: false });

  if (raw.version) {
    return { stdout: `${pkg.version}\n`, code: EExitCode.OK };
  }

  const options = parseCliOptions(raw);
  const result = await check({
    cwd: options.cwd,
    staleAfterMonths: options.staleAfterMonths,
    include: options.include,
    ignore: options.ignore,
    concurrency: options.concurrency,
    runner,
    now,
  });
  const out = options.json
    ? formatJson(result)
    : formatTable(result, { onlyProblems: options.onlyProblems, now });

  return { stdout: out, code: exitCodeFor(result, options.failOn) };
};

export const run = async (
  argv: string[],
  io: { runner?: TRunner; now?: Date } = {}
): Promise<IRunResult> => {
  try {
    return { ...(await execute(argv, io.runner, io.now ?? new Date())), stderr: '' };
  } catch (error) {
    if (error instanceof HelpText) {
      return { stdout: `${error.message}\n`, stderr: '', code: EExitCode.OK };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { stdout: '', stderr: `✖ ${message}\n`, code: EExitCode.EXCEPTION };
  }
};
