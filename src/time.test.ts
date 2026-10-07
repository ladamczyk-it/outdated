import { describe, expect, it } from 'vitest';

import { addMonths, isStale, relativeAge } from './time.ts';

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

  it('relativeAge days', () => {
    const now = d('2026-07-15T00:00:00Z');
    expect(relativeAge('2026-07-15T00:00:00Z', now)).toBe('0d ago');
    expect(relativeAge('2026-06-16T00:00:00Z', now)).toBe('29d ago');
  });

  it('relativeAge months', () => {
    const now = d('2026-07-15T00:00:00Z');
    expect(relativeAge('2026-06-15T00:00:00Z', now)).toBe('1m ago');
    expect(relativeAge('2026-05-15T00:00:00Z', now)).toBe('2m ago');
    expect(relativeAge('2025-07-26T00:00:00Z', now)).toBe('11m ago');
    expect(relativeAge('2026-01-15T00:00:00Z', d('2026-03-15T00:00:00Z'))).toBe('2m ago');
    expect(relativeAge('2025-07-16T00:00:00Z', d('2026-07-15T00:00:00Z'))).toBe('11m ago');
  });

  it('relativeAge years', () => {
    const now = d('2026-07-15T00:00:00Z');
    expect(relativeAge('2025-07-15T00:00:00Z', now)).toBe('1y ago');
    expect(relativeAge('2024-01-15T00:00:00Z', now)).toBe('2y ago');
  });

  it('relativeAge future', () => {
    const now = d('2026-07-15T00:00:00Z');
    expect(relativeAge('2026-07-16T00:00:00Z', now)).toBe('0d ago');
  });
});
