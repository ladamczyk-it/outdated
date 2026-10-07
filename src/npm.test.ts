import { describe, expect, it } from 'vitest';

import { parseOutdated, parseView } from './npm.ts';

const view = (extra: Record<string, unknown> = {}, time: Record<string, unknown> = {}): string =>
  JSON.stringify({
    'dist-tags': { latest: '2.0.0' },
    time: { created: '2019-01-01T00:00:00.000Z', '2.0.0': '2020-01-01T00:00:00.000Z', ...time },
    ...extra,
  });

describe('parseOutdated', () => {
  it('empty object means nothing outdated', () => {
    expect(parseOutdated('{}')).toStrictEqual({});
  });

  it('parseOutdated rejects empty, invalid and non-object stdout', () => {
    expect(() => parseOutdated('')).toThrow(/empty/i);
    expect(() => parseOutdated('not json')).toThrow(/json/i);
    expect(() => parseOutdated('[]')).toThrow(/object/i);
  });

  it('parseOutdated throws on npm error object', () => {
    expect(() => parseOutdated('{"error":{"code":"ENOENT","summary":"x"}}')).toThrow(/ENOENT/);
  });

  it('package named error is not a failure', () => {
    const out = parseOutdated('{"error":{"current":"1.0.0","wanted":"1.0.0","latest":"2.0.0"}}');

    expect(out).toStrictEqual({ error: { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' } });
  });

  it('missing current and array values', () => {
    const out = parseOutdated(
      '{"a":{"wanted":"1.1.0","latest":"2.0.0"},"b":[{"current":"1.0.0","wanted":"1.0.0","latest":"3.0.0"},{"current":"9.0.0"}]}'
    );

    expect(out.a).toStrictEqual({ current: null, wanted: '1.1.0', latest: '2.0.0' });
    expect(out.b).toStrictEqual({ current: '1.0.0', wanted: '1.0.0', latest: '3.0.0' });
  });
});

describe('parseView', () => {
  it('uses time of latest, never modified', () => {
    const out = parseView(view({}, { modified: '2024-05-05T00:00:00.000Z' }));

    expect(out).toStrictEqual({
      latest: '2.0.0',
      lastPublish: '2020-01-01T00:00:00.000Z',
      deprecated: null,
      latestNode: null,
    });
  });

  it('reads engines.node of the latest release', () => {
    const node = (engines: unknown) => parseView(view({ engines }));

    expect(node({ node: '^22.18 || >= 24' })).toMatchObject({ latestNode: '^22.18 || >= 24' });
    expect(node({ node: '' })).toMatchObject({ latestNode: null });
    expect(node({ npm: '>=10' })).toMatchObject({ latestNode: null });
    expect(node(['node'])).toMatchObject({ latestNode: null });
    expect(node('>=14')).toMatchObject({ latestNode: null });
    expect(parseView(view())).toMatchObject({ latestNode: null });
  });

  it('deprecated message handling', () => {
    expect(parseView(view({ deprecated: 'use x' }))).toMatchObject({ deprecated: 'use x' });
    expect(parseView(view())).toMatchObject({ deprecated: null });
    expect(parseView(view({ deprecated: '' }))).toMatchObject({ deprecated: null });
  });

  it('view error object becomes unknown', () => {
    const out = parseView('{"error":{"code":"E404","summary":"Not Found"}}');

    expect(out).toHaveProperty('unknown');
    expect((out as { unknown: string }).unknown).toContain('E404');
    expect((out as { unknown: string }).unknown).toContain('Not Found');
  });

  it('view malformed output becomes unknown', () => {
    const inputs = [
      'not json',
      '"bare"',
      '[]',
      JSON.stringify({ time: {} }),
      view({}, { '2.0.0': undefined }),
      view({}, { '2.0.0': 'garbage' }),
    ];

    for (const input of inputs) {
      expect(parseView(input)).toHaveProperty('unknown');
    }
    expect(parseView('"bare"')).toStrictEqual({ unknown: 'unexpected npm view output' });
  });
});
