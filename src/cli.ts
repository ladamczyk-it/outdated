#!/usr/bin/env node

import { EExitCode } from '@ladamczyk/qoq-utils';
import cac from 'cac';
import c from 'picocolors';

import { check } from './check.ts';

const cli = cac('outdated');

cli
  .command('', 'Report outdated dependencies')
  .option('--cwd <path>', 'Project folder (default: current directory)')
  .option('--json', 'Output machine-readable JSON')
  .action(async (options: { cwd?: string; json?: boolean }) => {
    try {
      const result = await check(options.cwd ? { cwd: options.cwd } : {});

      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(EExitCode.OK);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      process.stderr.write(c.red(`✖ ${message}`));
      process.stderr.write('\n');
      process.exit(EExitCode.EXCEPTION);
    }
  });

cli.help();
cli.parse();
