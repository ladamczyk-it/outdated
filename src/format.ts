import type { ICheckResult } from './types.ts';

export const format = (result: ICheckResult, json: boolean): string =>
  json
    ? `${JSON.stringify(result, null, 2)}\n`
    : result.packages.map((p) => `${p.name}  ${p.current} → ${p.latest}\n`).join('') || 'All dependencies up to date\n';
