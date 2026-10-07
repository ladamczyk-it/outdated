import { EExitCode } from '@ladamczyk/qoq-utils';

import type { ICheckResult, TDepType, TProblem } from './types.ts';

export interface ICliOptions {
  cwd?: string | undefined;
  staleAfterMonths: number;
  include: readonly TDepType[];
  ignore: readonly string[];
  concurrency: number;
  json: boolean;
  onlyProblems: boolean;
  failOn: readonly TProblem[];
}

const DEP_TYPES: readonly TDepType[] = ['prod', 'dev', 'optional'];
const PROBLEMS: readonly TProblem[] = ['stale', 'deprecated', 'outdated', 'unknown'];

// Both spellings of each key: cac may emit camelCase, the hyphenated original, or both.
const KNOWN_KEYS = new Set([
  '--',
  'cwd',
  'staleAfter',
  'stale-after',
  'include',
  'ignore',
  'concurrency',
  'json',
  'onlyProblems',
  'only-problems',
  'failOn',
  'fail-on',
  'h',
  'v',
  'help',
  'version',
]);

// Coerce like String(), joining repeated flags with commas; objects never arrive from mri.
const toText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(toText).join(',');
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value) ?? String(undefined);
};

const pick = (raw: Record<string, unknown>, camel: string, kebab: string): unknown =>
  raw[camel] ?? raw[kebab];

const parsePositiveInt = (value: unknown, flag: string, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const text = toText(value);

  if (!/^[1-9]\d*$/.test(text)) {
    throw new Error(`${flag} must be a positive integer, got "${text}"`);
  }

  return Number(text);
};

const parseList = (value: unknown, flag: string): string[] => {
  const text = toText(value);
  const parts = text.split(',');

  if (typeof value === 'boolean' || parts.includes('')) {
    throw new Error(`${flag} must be a comma-separated list without empty entries, got "${text}"`);
  }

  return parts;
};

const parseChoices = <T extends string>(
  value: unknown,
  flag: string,
  allowed: readonly T[],
  fallback: readonly T[]
): readonly T[] => {
  if (value === undefined) {
    return fallback;
  }

  const parts = parseList(value, flag);
  const bad = parts.find((part) => !(allowed as readonly string[]).includes(part));

  if (bad !== undefined) {
    throw new Error(`${flag} has invalid value "${bad}"; allowed: ${allowed.join(', ')}`);
  }

  return parts as T[];
};

const parseBoolean = (value: unknown, flag: string): boolean => {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${flag} is a switch and takes no value, got "${toText(value)}"`);
  }

  return value;
};

const parseCwd = (value: unknown): { cwd: string } | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`--cwd must be a single path, got "${toText(value)}"`);
  }

  return { cwd: String(value) };
};

export const parseCliOptions = (raw: Record<string, unknown>): ICliOptions => {
  const unknownKey = Object.keys(raw).find((key) => !KNOWN_KEYS.has(key));

  if (unknownKey !== undefined) {
    throw new Error(`Unknown option: ${unknownKey}`);
  }

  const { ignore } = raw;

  return {
    ...parseCwd(raw.cwd),
    staleAfterMonths: parsePositiveInt(pick(raw, 'staleAfter', 'stale-after'), '--stale-after', 6),
    include: parseChoices(raw.include, '--include', DEP_TYPES, DEP_TYPES),
    ignore: ignore === undefined ? [] : parseList(ignore, '--ignore'),
    concurrency: parsePositiveInt(raw.concurrency, '--concurrency', 6),
    json: parseBoolean(raw.json, '--json'),
    onlyProblems: parseBoolean(pick(raw, 'onlyProblems', 'only-problems'), '--only-problems'),
    failOn: parseChoices(pick(raw, 'failOn', 'fail-on'), '--fail-on', PROBLEMS, []),
  };
};

export const exitCodeFor = (result: ICheckResult, failOn: readonly TProblem[]): EExitCode =>
  failOn.some((flag) => result.summary[flag] > 0) ? EExitCode.ERROR : EExitCode.OK;
