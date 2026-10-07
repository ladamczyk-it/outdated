import { describe, expect, it } from 'vitest';

import { check } from './check.ts';
import * as api from './index.ts';

describe('check stub', () => {
  it('stub returns an empty valid result', async () => {
    const result = await check();

    expect(result.schemaVersion).toBe(1);
    expect(result.packages).toStrictEqual([]);
    expect(result.skipped).toStrictEqual([]);
    expect(result.staleAfterMonths).toBe(6);
    expect(result.summary).toStrictEqual({
      total: 0,
      deprecated: 0,
      stale: 0,
      outdated: 0,
      unknown: 0,
      ok: 0,
      skipped: 0,
    });
  });

  it('stub echoes staleAfterMonths', async () => {
    const result = await check({ staleAfterMonths: 12 });

    expect(result.staleAfterMonths).toBe(12);
  });

  it('public API exports check', () => {
    expect(api.check).toBe(check);
    expect('format' in api).toBe(false);
  });
});
