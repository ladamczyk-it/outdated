import { describe, expect, it } from 'vitest';

import { formatJson, formatTable } from './format.ts';

import type { ICheckResult, IPackageResult, ISkipped } from './types.ts';

const now = new Date('2026-03-05T00:00:00.000Z');

const pkg = (overrides: Partial<IPackageResult> = {}): IPackageResult => ({
  workspace: 'demo',
  location: 'node_modules/left-pad',
  name: 'left-pad',
  queriedName: null,
  type: 'prod',
  specifier: '^1.0.0',
  current: '1.0.0',
  wanted: '1.0.0',
  latest: '1.0.0',
  outdated: false,
  majorBump: false,
  deprecated: null,
  latestNode: null,
  repository: null,
  lastPublish: '2026-03-01T00:00:00.000Z',
  stale: false,
  unknown: null,
  flags: ['ok'],
  ...overrides,
});

const makeResult = (packages: IPackageResult[], skipped: ISkipped[] = []): ICheckResult => ({
  schemaVersion: 2,
  generatedAt: now.toISOString(),
  staleAfterMonths: 6,
  project: 'demo',
  workspaces: ['demo'],
  packages,
  summary: {
    total: packages.length,
    deprecated: packages.filter((p) => p.flags.includes('deprecated')).length,
    stale: packages.filter((p) => p.flags.includes('stale')).length,
    outdated: packages.filter((p) => p.flags.includes('outdated')).length,
    unknown: packages.filter((p) => p.flags.includes('unknown')).length,
    blocked: packages.filter((p) => p.flags.includes('blocked')).length,
    ok: packages.filter((p) => p.flags.includes('ok')).length,
    skipped: skipped.length,
  },
  skipped,
});

const table = (packages: IPackageResult[], all = true, skipped: ISkipped[] = []) =>
  formatTable(makeResult(packages, skipped), { all, now });

describe('format', () => {
  it('formatJson is the stable document', () => {
    const result = makeResult([pkg({ majorBump: true, flags: ['outdated'] })]);
    const json = formatJson(result);

    expect(json).toBe(`${JSON.stringify(result, null, 2)}\n`);
    expect(json).not.toContain('\u001b');
  });

  it('table header', () => {
    const header = table([pkg()]).split('\n')[0] ?? '';
    const positions = [
      'Package',
      'Current',
      'Wanted',
      'Latest',
      'Location',
      'Depended by',
      'Last publish',
      'Links',
      'Flags',
    ].map((h) => header.indexOf(h));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toStrictEqual(positions);
  });

  it('rows are grouped by dependency type', () => {
    const out = table([
      pkg({ name: 'zeta', type: 'dev' }),
      pkg({ name: 'mid', type: 'prod' }),
      pkg({ name: 'alpha', type: 'dev', flags: ['stale'], stale: true }),
      pkg({ name: 'solo', type: 'optional' }),
      pkg({ name: 'beta', type: 'prod' }),
    ]);
    const title = /^(?:optional|dev)?[dD]ependencies \(\d+\)$/;
    const lines = out
      .split('\n')
      .filter((l) => title.test(l) || /^(zeta|mid|alpha|solo|beta)\s/.test(l))
      .map((l) => (title.test(l) ? l : (l.split(/\s+/)[0] ?? '')));

    expect(lines).toStrictEqual([
      'dependencies (2)',
      'mid',
      'beta',
      'devDependencies (2)',
      'zeta',
      'alpha',
      'optionalDependencies (1)',
      'solo',
    ]);
  });

  it('empty sections are omitted', () => {
    const out = table([pkg({ type: 'dev' })]);

    expect(out).toContain('devDependencies (1)');
    expect(out).not.toMatch(/^dependencies/m);
    expect(out).not.toContain('optionalDependencies');
  });

  it('last publish with age', () => {
    expect(table([pkg({ lastPublish: '2026-01-01T00:00:00.000Z' })])).toContain(
      '2026-01-01 (2m ago)'
    );
  });

  it('null cells', () => {
    const row =
      table([pkg({ current: null, wanted: null, latest: null, lastPublish: null })])
        .split('\n')
        .find((l) => l.startsWith('left-pad')) ?? '';
    const cells = row.split(/\s{2,}/);

    expect(cells.slice(1, 4)).toStrictEqual(['-', '-', '-']);
    expect(cells[6]).toBe('-');
  });

  it('mirrors the npm outdated columns, ours last', () => {
    const row =
      table([
        pkg({
          name: 'typescript',
          location: 'node_modules/typescript',
          current: '6.0.3',
          wanted: '6.0.3',
          latest: '7.0.2',
        }),
      ])
        .split('\n')
        .find((l) => l.startsWith('typescript')) ?? '';

    expect(row.split(/\s{2,}/)).toStrictEqual([
      'typescript',
      '6.0.3',
      '6.0.3',
      '7.0.2',
      'node_modules/typescript',
      'demo',
      '2026-03-01 (4d ago)',
      'npm',
      'ok',
    ]);
  });

  it('wanted falls back to current when not outdated', () => {
    const row =
      table([pkg({ current: '1.2.3', wanted: null })])
        .split('\n')
        .find((l) => l.startsWith('left-pad')) ?? '';

    expect(row.split(/\s{2,}/)[2]).toBe('1.2.3');
  });

  it('version columns are right-aligned', () => {
    const lines = table([
      pkg({ name: 'a', current: '1.0.0' }),
      pkg({ name: 'b', current: '10.20.30' }),
    ]).split('\n');
    const end = (name: string, version: string): number => {
      const line = lines.find((l) => l.startsWith(name)) ?? '';
      return line.indexOf(version) + version.length;
    };

    expect(end('a', '1.0.0')).toBe(end('b', '10.20.30'));
  });

  it('deprecation truncation', () => {
    const deprecated = (message: string) =>
      table([pkg({ deprecated: message, flags: ['deprecated'] })]);
    const exact = deprecated('x'.repeat(60));
    const over = deprecated(`${'a'.repeat(59)}bc`);

    expect(exact).toContain('x'.repeat(60));
    expect(exact).not.toContain('…');
    expect(over).toContain(`${'a'.repeat(59)}…`);
    expect(over).not.toContain('a'.repeat(60));
    expect(over).not.toContain('bc');
    expect(deprecated('use other')).toContain('use other');
  });

  it('blocked states which node the latest release needs', () => {
    const blocked = pkg({ latest: '10.0.1', latestNode: '^22.18 || >= 24', flags: ['blocked'] });
    const out = table([blocked]);

    expect(out).toContain('latest needs node ^22.18 || >= 24');
    const row = out.split('\n').find((l) => l.startsWith('left-pad')) ?? '';

    expect(row.endsWith('latest needs node ^22.18 || >= 24')).toBe(true);
    expect(row).not.toMatch(/\bok\b/);
    expect(out).toContain('1 blocked');
  });

  it('unknown reason shown', () => {
    expect(table([pkg({ unknown: 'E404 not found', flags: ['unknown'] })])).toContain(
      'E404 not found'
    );
  });

  it('hides ok rows without all', () => {
    const packages = [pkg({ name: 'bad', flags: ['stale'], stale: true }), pkg({ name: 'fine' })];
    const hidden = table(packages, false);
    const shown = table(packages, true);

    expect(hidden).toContain('bad');
    expect(hidden).not.toContain('fine');
    expect(hidden).toContain(
      '2 packages · 0 deprecated · 1 stale · 0 outdated · 0 unknown · 0 blocked · 1 ok'
    );
    expect(shown).toContain('fine');
  });

  it('all shows ok rows alongside problems', () => {
    const out = table(
      [pkg({ name: 'bad', deprecated: 'gone', flags: ['deprecated'] }), pkg({ name: 'fine' })],
      true
    );

    expect(out).toContain('bad');
    expect(out).toContain('fine');
  });

  it('blocked rows are not ok and stay visible without all', () => {
    const out = table([pkg({ name: 'blocked-pkg', latestNode: '^22', flags: ['blocked'] })], false);

    expect(out).toContain('blocked-pkg');
  });

  it('only ok rows without all print No problems found, no header, and the footer', () => {
    const out = table([pkg({ name: 'one' }), pkg({ name: 'two' })], false);

    expect(out).toContain('No problems found');
    expect(out).not.toContain('Package');
    expect(out).toContain('2 packages');
  });

  it('zero packages without all still print No dependencies found', () => {
    const out = table([], false);

    expect(out).toContain('No dependencies found');
  });

  it('skipped section', () => {
    const out = table([pkg()], true, [
      {
        workspace: 'demo',
        name: 'local-dep',
        type: 'prod',
        specifier: 'file:../x',
        reason: 'local path',
      },
    ]);

    expect(out).toContain('Skipped:');
    expect(out).toMatch(/local-dep\s+file:\.\.\/x — local path/);
  });

  it('empty result', () => {
    const out = table([]);

    expect(out).toContain('No dependencies found');
    expect(out).not.toContain('Package');
    expect(out).toContain('0 packages');
  });
});

const mono = (packages: IPackageResult[], skipped: ISkipped[] = []): ICheckResult => ({
  ...makeResult(packages, skipped),
  workspaces: ['demo', 'web', 'api'],
});
const bad = (workspace: string, name: string, overrides: Partial<IPackageResult> = {}) =>
  pkg({
    workspace,
    name,
    location: `packages/${workspace}/node_modules/${name}`,
    flags: ['stale'],
    stale: true,
    ...overrides,
  });
const renderWs = (result: ICheckResult, all = false) => formatTable(result, { all, now });

describe('format workspace blocks', () => {
  it('single-package output has no block line, node_modules location and project dependent', () => {
    const out = table([pkg()]);

    expect(out).not.toMatch(/\(\d+ problems?\)/);
    expect(out).toContain('node_modules/left-pad');
    expect(
      out
        .split('\n')
        .find((l) => l.startsWith('left-pad'))
        ?.split(/\s{2,}/)[5]
    ).toBe('demo');
  });

  it('renders a block per workspace in workspaces order with problem counts', () => {
    const out = renderWs(mono([bad('api', 'a1'), bad('web', 'w1'), bad('web', 'w2')])).split('\n');

    expect(out.filter((l) => /\(\d+ problems?\)$/.test(l))).toStrictEqual([
      'web (2 problems)',
      'api (1 problem)',
    ]);
  });

  it('all-ok workspace has no block without all, and (0 problems) with all', () => {
    const result = mono([bad('web', 'w1'), pkg({ workspace: 'api', name: 'fine' })]);

    expect(renderWs(result)).not.toContain('api (');
    expect(renderWs(result, true)).toContain('api (0 problems)');
  });

  it('Location shows location and Depended by shows workspace', () => {
    const row =
      renderWs(mono([bad('web', 'ms')]))
        .split('\n')
        .find((l) => l.startsWith('ms')) ?? '';
    const cells = row.split(/\s{2,}/);

    expect(cells[4]).toBe('packages/web/node_modules/ms');
    expect(cells[5]).toBe('web');
  });

  it('column widths are shared across blocks', () => {
    const lines = renderWs(mono([bad('web', 'w1'), bad('api', 'a-very-long-package-name')])).split(
      '\n'
    );
    const row = lines.find((l) => l.startsWith('w1')) ?? '';

    expect(row.indexOf('1.0.0')).toBeGreaterThanOrEqual('a-very-long-package-name'.length);
  });

  it('monorepo with no problem rows prints No problems found and the footer', () => {
    const out = renderWs(mono([pkg({ workspace: 'web', name: 'fine' })]));

    expect(out).toContain('No problems found');
    expect(out).not.toMatch(/\(\d+ problems?\)/);
    expect(out).toContain('1 packages');
  });

  it('monorepo skipped list is prefixed by workspace', () => {
    const out = renderWs(
      mono(
        [pkg()],
        [
          {
            workspace: 'web',
            name: 'api',
            type: 'prod',
            specifier: '^1.0.0',
            reason: 'workspace package',
          },
        ]
      )
    );

    expect(out).toMatch(/web: api\s+\^1\.0\.0 — workspace package/);
  });
});

describe('format colours and links', () => {
  it('colours flags only when asked', () => {
    const packages = [
      pkg({ name: 'd', deprecated: 'gone', flags: ['deprecated'] }),
      pkg({ name: 'm', majorBump: true, flags: ['outdated'] }),
    ];
    const render = (color: boolean) => formatTable(makeResult(packages), { all: true, now, color });
    const plain = render(false);
    const coloured = render(true);
    // eslint-disable-next-line no-control-regex
    const stripped = coloured.replace(/\u001b\[\d+m|\u001b\]8;;[^\u001b]*\u001b\\/g, '');

    expect(plain).not.toContain('\u001b');
    expect(coloured).toContain('\u001b[31mdeprecated gone\u001b[39m');
    expect(coloured).toContain('\u001b[36moutdated\u001b[39m');
    expect(coloured).toContain('\u001b[31m1.0.0');
    expect(stripped).toBe(plain);
  });

  it('uses the npm outdated palette', () => {
    const lagging = pkg({
      name: 'lag',
      location: 'node_modules/lag',
      current: '1.0.0',
      wanted: '1.0.0',
      latest: '2.0.0',
      outdated: true,
      flags: ['outdated'],
    });
    const behind = pkg({
      name: 'behind',
      current: '1.0.0',
      wanted: '1.1.0',
      latest: '1.1.0',
      outdated: true,
      flags: ['outdated'],
    });
    const out = formatTable(makeResult([lagging, behind]), {
      all: true,
      now,
      color: true,
    });

    expect(out).toContain('\u001b[33mlag\u001b[39m');
    expect(out).toContain('\u001b[31mbehind\u001b[39m');
    expect(out).toContain('\u001b[32m1.1.0\u001b[39m');
    expect(out).toContain('\u001b[35m2.0.0\u001b[39m');
    expect(out).toContain('\u001b[2mnode_modules/lag');
  });

  it('links npm and repository labels only when colour is on', () => {
    const packages = [
      pkg({ name: 'left-pad', repository: 'https://github.com/x/left-pad' }),
      pkg({ name: 'pc', queriedName: 'picocolors', repository: 'https://example.org/pc' }),
      pkg({ name: 'bare' }),
    ];
    const render = (color: boolean) => formatTable(makeResult(packages), { all: true, now, color });
    const link = (url: string, text: string) => `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`;
    const npm = (name: string) => `https://www.npmjs.com/package/${name}`;

    expect(render(true)).toContain(
      `${link(npm('left-pad'), 'npm')} / ${link('https://github.com/x/left-pad', 'repo')}`
    );
    expect(render(true)).toContain(
      `${link(npm('picocolors'), 'npm')} / ${link('https://example.org/pc', 'repo')}`
    );
    expect(render(true)).toContain(link(npm('bare'), 'npm'));
    expect(render(false)).not.toContain('npmjs.com');
    expect(render(false)).toContain('npm / repo');
  });
});
