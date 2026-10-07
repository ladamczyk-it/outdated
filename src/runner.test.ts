import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { createNpmRunner } from './runner.ts';

const root = mkdtempSync(join(tmpdir(), 'outdated-runner-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('createNpmRunner', () => {
  it('captures stdout from real npm', async () => {
    const out = await createNpmRunner()(['--version']);

    expect(out).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('quotes arguments with spaces, quotes and dollars', async () => {
    const p = join(root, "a b's $HOME");
    mkdirSync(p);

    const out = await createNpmRunner()(['prefix', '--prefix', p]);

    expect(out.trim()).toBe(p);
  });

  it('rejects control characters in arguments', async () => {
    const run = createNpmRunner();

    await expect(run(['view', 'a\nb'])).rejects.toThrow(/control character/);
    await expect(run(['view', 'a\0b'])).rejects.toThrow(/control character/);
  });

  it('runner is the only executeCommand importer', () => {
    const files = readdirSync(__dirname).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts')
    );
    const importers = files.filter((f) =>
      /import[^;]*\bexecuteCommand\b[^;]*from/s.test(readFileSync(join(__dirname, f), 'utf-8'))
    );

    expect(importers).toStrictEqual(['runner.ts']);
  });
});
