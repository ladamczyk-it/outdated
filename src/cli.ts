#!/usr/bin/env node

import { EExitCode } from '@ladamczyk/qoq-utils';
import cac from 'cac';
import c from 'picocolors';

import { check } from './check.ts';
import { format } from './format.ts';

const cli = cac('outdated');

cli
  .command('', 'Report outdated dependencies')
  .option('--cwd <path>', 'Project folder (default: current directory)')
  .option('--json', 'Output machine-readable JSON')
  .action(async (options: { cwd?: string; json?: boolean }) => {
    try {
      const result = await check(options.cwd ? { cwd: options.cwd } : {});

      process.stdout.write(format(result, options.json ?? false));
      process.exit(result.passed ? EExitCode.OK : EExitCode.ERROR);
    } catch (error) {
      process.stderr.write(`${c.red(`✖ ${error instanceof Error ? error.message : String(error)}`)}\n`);
      process.exit(EExitCode.EXCEPTION);
    }
  });

cli.help();
cli.parse();
