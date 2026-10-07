import { executeCommand } from '@ladamczyk/qoq-utils';

import type { TRunner } from './types.ts';

const SHELL_SINGLE_QUOTE = String.raw`'\''`;

// Windows double-quoting is unverified (no Windows host available).
const quote = (arg: string): string =>
  process.platform === 'win32'
    ? `"${arg.replaceAll('"', '""')}"`
    : `'${arg.replaceAll("'", SHELL_SINGLE_QUOTE)}'`;

export const createNpmRunner = (): TRunner => async (args) => {
  if (args.some((arg) => /[\0\n\r]/.test(arg))) {
    throw new Error('npm argument contains a control character');
  }

  // The helper's default stdio 'inherit' yields empty captured output, so pipe explicitly.
  const out = await executeCommand(
    ['npm', ...args.map(quote)].join(' '),
    [],
    ['ignore', 'pipe', 'pipe'],
    true
  );

  return String(out);
};
