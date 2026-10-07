export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Set<Promise<unknown>> = new Set();

  for (const [i, item] of items.entries()) {
    const promise = fn(item).then((res) => {
      results[i] = res;
      executing.delete(promise);
    });

    executing.add(promise);

    if (executing.size === limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
