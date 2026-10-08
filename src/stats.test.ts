import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveConsent, sendStats } from './stats.ts';

const file = () => join(mkdtempSync(join(tmpdir(), 'outdated-stats-')), 'outdated.json');

const interactive = (): void => {
  vi.stubEnv('CI', '');
  vi.stubGlobal('process', { ...process, stdin: { isTTY: true }, stdout: { isTTY: true } });
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('resolveConsent', () => {
  it('returns the stored answer without asking', async () => {
    const path = file();

    writeFileSync(path, JSON.stringify({ stats: true }));
    interactive();

    await expect(resolveConsent(path)).resolves.toBe(true);
  });

  it('returns a stored decline without asking again', async () => {
    const path = file();

    writeFileSync(path, JSON.stringify({ stats: false }));
    interactive();

    await expect(resolveConsent(path)).resolves.toBe(false);
  });

  it('stays unanswered in CI, and writes nothing', async () => {
    vi.stubEnv('CI', 'true');

    const path = file();

    await expect(resolveConsent(path)).resolves.toBeUndefined();
    expect(() => readFileSync(path)).toThrow();
  });

  it('stays unanswered without a TTY', async () => {
    vi.stubEnv('CI', '');
    vi.stubGlobal('process', { ...process, stdin: { isTTY: false }, stdout: { isTTY: false } });

    await expect(resolveConsent(file())).resolves.toBeUndefined();
  });

  it('keeps a stored decline distinct from never asked', async () => {
    const denied = file();

    writeFileSync(denied, JSON.stringify({ stats: false }));
    vi.stubEnv('CI', 'true');

    await expect(resolveConsent(denied)).resolves.toBe(false);
    await expect(resolveConsent(file())).resolves.toBeUndefined();
  });

  it('treats a corrupt consent file as never asked', async () => {
    const path = file();

    writeFileSync(path, 'not json');
    vi.stubEnv('CI', 'true');

    await expect(resolveConsent(path)).resolves.toBeUndefined();
  });
});

describe('sendStats', () => {
  // Transport — both endpoints, the shared deadline, the swallowed failures —
  // is qoq-utils' and tested there. All this binds is the tool name, and that
  // `options` stays empty.
  it('posts the tool name and an always-empty options array', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);

    await sendStats();

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];

    expect(JSON.parse(init.body)).toEqual({ tool: 'outdated', options: [] });
  });
});
