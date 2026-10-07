import { describe, expect, it } from 'vitest';

import { format } from './format.ts';

describe('format', () => {
  it('reports up to date', () => {
    expect(format({ passed: true, packages: [] }, false)).toContain('up to date');
  });

  it('lists outdated packages', () => {
    expect(format({ passed: false, packages: [{ name: 'a', current: '1.0.0', latest: '2.0.0' }] }, false)).toBe(
      'a  1.0.0 → 2.0.0\n',
    );
  });
});
