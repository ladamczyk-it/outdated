import type { ICheckOptions, ICheckResult } from './types.ts';

// Temporary stub; Ticket 1.7 replaces it.
export const check = (options: ICheckOptions = {}): Promise<ICheckResult> =>
  Promise.resolve({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    staleAfterMonths: options.staleAfterMonths ?? 6,
    packages: [],
    summary: { total: 0, deprecated: 0, stale: 0, outdated: 0, unknown: 0, ok: 0, skipped: 0 },
    skipped: [],
  });
