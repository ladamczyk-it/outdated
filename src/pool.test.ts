import { describe, expect, it } from 'vitest';

import { mapPool } from './pool.ts';

describe('mapPool', () => {
  it('preserves input order', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapPool(items, 2, async (n) => {
      // Delay inversely proportional to input so results return out of order
      const delay = (6 - n) * 10;
      return new Promise<number>((resolve) => {
        setTimeout(() => {
          resolve(n * 2);
        }, delay);
      });
    });

    expect(results).toStrictEqual([2, 4, 6, 8, 10]);
  });

  it('never exceeds the limit', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const items = [1, 2, 3, 4, 5];
    await mapPool(items, 2, async () => {
      currentConcurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      currentConcurrent -= 1;
    });

    expect(maxConcurrent).toBe(2);
  });

  it('empty input', async () => {
    const results = await mapPool([], 2, () => {
      return Promise.resolve('never called');
    });

    expect(results).toStrictEqual([]);
  });
});
