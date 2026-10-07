export interface IOutdatedEntry {
  current: string | null;
  wanted: string | null;
  latest: string | null;
}

export type TViewResult =
  | { latest: string; lastPublish: string; deprecated: string | null; latestNode: string | null }
  | { unknown: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

const parseJson = (stdout: string): unknown => JSON.parse(stdout) as unknown;

const toEntry = (value: unknown): IOutdatedEntry => {
  const raw = Array.isArray(value) ? value[0] : value;
  const e = isRecord(raw) ? raw : {};
  return { current: str(e.current), wanted: str(e.wanted), latest: str(e.latest) };
};

const errorText = (err: unknown): string | null => {
  if (!isRecord(err) || (err.code === undefined && err.summary === undefined)) {
    return null;
  }
  return [str(err.code), str(err.summary)].filter(Boolean).join(' ');
};

export const parseOutdated = (stdout: string): Record<string, IOutdatedEntry> => {
  if (stdout.trim() === '') {
    throw new Error('npm outdated printed empty output');
  }
  let parsed: unknown;
  try {
    parsed = parseJson(stdout);
  } catch {
    throw new Error('npm outdated printed invalid JSON');
  }
  if (!isRecord(parsed)) {
    throw new Error('npm outdated printed non-object JSON');
  }
  const failure = errorText(parsed.error);
  if (failure !== null) {
    throw new Error(`npm outdated failed: ${failure}`);
  }
  return Object.fromEntries(Object.entries(parsed).map(([name, v]) => [name, toEntry(v)]));
};

// engines may be an array or odd shapes in old packages; only `{ node: "<range>" }` counts.
const nodeRange = (engines: unknown): string | null =>
  isRecord(engines) && typeof engines.node === 'string' && engines.node !== ''
    ? engines.node
    : null;

const UNEXPECTED: TViewResult = { unknown: 'unexpected npm view output' };

const buildView = (parsed: Record<string, unknown>): TViewResult => {
  const tags = parsed['dist-tags'];
  const latest = isRecord(tags) ? str(tags.latest) : null;
  if (latest === null || !isRecord(parsed.time)) {
    return UNEXPECTED;
  }
  const lastPublish = str(parsed.time[latest]);
  if (lastPublish === null || Number.isNaN(Date.parse(lastPublish))) {
    return { unknown: `no valid publish time for ${latest}` };
  }
  const dep = parsed.deprecated;
  return {
    latest,
    lastPublish,
    deprecated: typeof dep === 'string' && dep !== '' ? dep : null,
    latestNode: nodeRange(parsed.engines),
  };
};

export const parseView = (stdout: string): TViewResult => {
  let parsed: unknown;
  try {
    parsed = parseJson(stdout);
  } catch {
    return { unknown: 'invalid npm view JSON' };
  }
  if (!isRecord(parsed)) {
    return UNEXPECTED;
  }
  if ('error' in parsed) {
    return { unknown: errorText(parsed.error) ?? 'npm view error' };
  }
  return buildView(parsed);
};
