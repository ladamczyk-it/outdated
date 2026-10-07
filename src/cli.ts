#!/usr/bin/env node

import { run } from './run.ts';

const { stdout, stderr, code } = await run(process.argv.slice(2));

process.stderr.write(stderr);
// Exit in the write callback: a synchronous exit can truncate large piped output.
process.stdout.write(stdout, () => process.exit(code));
