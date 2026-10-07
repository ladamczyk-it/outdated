import { describe, expect, it } from 'vitest';

import { addMonths, isStale } from './time.ts';

const d = (s: string): Date => new Date(s);

describe('time', () => {
  it('addMonths clamps to month end', () => {
    expect(addMonths(d('2026-03-31T00:00:00Z'), -1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('addMonths honours leap years', () => {
    expect(addMonths(d('2024-03-31T00:00:00Z'), -1).toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  it('addMonths crosses year', () => {
    expect(addMonths(d('2026-01-15T00:00:00Z'), -6).toISOString()).toBe('2025-07-15T00:00:00.000Z');
  });

  it('isStale boundary and future', () => {
    const now = d('2026-07-15T00:00:00Z');
    expect(isStale(d('2026-01-14T00:00:00Z'), now, 6)).toBe(true);
    expect(isStale(d('2026-01-15T00:00:00Z'), now, 6)).toBe(false);
    expect(isStale(d('2026-08-01T00:00:00Z'), now, 6)).toBe(false);
  });
});
