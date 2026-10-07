import { EExitCode } from '@ladamczyk/qoq-utils';
import { describe, expect, it } from 'vitest';

import { exitCodeFor, parseCliOptions } from './options.ts';

import type { ICheckResult, TProblem } from './types.ts';

const expectRejected = (key: string, values: unknown[], flag: string): void => {
  for (const value of values) {
    expect(() => parseCliOptions({ [key]: value }), `${key}=${String(value)}`).toThrow(flag);
  }
};

const resultWith = (counts: Partial<Record<TProblem, number>>): ICheckResult => ({
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  staleAfterMonths: 6,
  project: 'demo',
  packages: [],
  summary: {
    total: 0,
    deprecated: 0,
    stale: 0,
    outdated: 0,
    unknown: 0,
    blocked: 0,
    ok: 0,
    skipped: 0,
    ...counts,
  },
  skipped: [],
});

describe('parseCliOptions', () => {
  it('defaults', () => {
    const options = parseCliOptions({});

    expect(options.staleAfterMonths).toBe(6);
    expect(options.concurrency).toBe(6);
    expect([...options.include].sort()).toStrictEqual(['dev', 'optional', 'prod']);
    expect(options.ignore).toStrictEqual([]);
    expect(options.json).toBe(false);
    expect(options.onlyProblems).toBe(false);
    expect(options.failOn).toStrictEqual([]);
    expect('cwd' in options).toBe(false);
  });

  it('stale-after accepts only positive integers', () => {
    expect(parseCliOptions({ staleAfter: 12 }).staleAfterMonths).toBe(12);
    expect(parseCliOptions({ staleAfter: '12' }).staleAfterMonths).toBe(12);
    expect(parseCliOptions({ 'stale-after': '12' }).staleAfterMonths).toBe(12);
    expectRejected('staleAfter', [0, -1, 1.5, 'abc', '12m', true], '--stale-after');
  });

  it('concurrency accepts only positive integers', () => {
    expect(parseCliOptions({ concurrency: 4 }).concurrency).toBe(4);
    expect(parseCliOptions({ concurrency: '4' }).concurrency).toBe(4);
    expectRejected('concurrency', [0, -1, 1.5, 'abc', '12m', true], '--concurrency');
  });

  it('include validation', () => {
    expect(parseCliOptions({ include: 'dev,prod' }).include).toStrictEqual(['dev', 'prod']);
    expectRejected('include', ['dev,x', 'dev,', ''], '--include');
    expect(() => parseCliOptions({ include: 'x' })).toThrow('prod');
  });

  it('fail-on validation', () => {
    expect(parseCliOptions({ failOn: 'stale,deprecated' }).failOn).toStrictEqual([
      'stale',
      'deprecated',
    ]);
    expect(parseCliOptions({ 'fail-on': 'stale' }).failOn).toStrictEqual(['stale']);
    expectRejected('failOn', ['stale,ok', 'bogus'], '--fail-on');
  });

  it('ignore parsing', () => {
    expect(parseCliOptions({ ignore: 'a,b' }).ignore).toStrictEqual(['a', 'b']);
    expectRejected('ignore', ['a,'], '--ignore');
  });

  it('unknown flags throw', () => {
    expect(() => parseCliOptions({ nope: true })).toThrow('nope');
    expect(() => parseCliOptions({ '--': [], json: true, onlyProblems: true })).not.toThrow();
  });

  it('cwd coercion', () => {
    expect(parseCliOptions({ cwd: 123 }).cwd).toBe('123');
    expectRejected('cwd', [['a', 'b']], '--cwd');
  });
});

describe('exitCodeFor', () => {
  it('exitCodeFor', () => {
    const result = resultWith({ stale: 2 });

    expect(exitCodeFor(result, ['stale'])).toBe(EExitCode.ERROR);
    expect(exitCodeFor(result, ['deprecated', 'stale'])).toBe(EExitCode.ERROR);
    expect(exitCodeFor(result, ['deprecated'])).toBe(EExitCode.OK);
    expect(exitCodeFor(result, [])).toBe(EExitCode.OK);
  });
});
