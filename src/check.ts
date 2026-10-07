import type { ICheckOptions, ICheckResult } from './types.ts';

// TODO: read package.json deps from options.cwd, query the registry, collect outdated ones.
export const check = async (_options: ICheckOptions = {}): Promise<ICheckResult> => ({ passed: true, packages: [] });
