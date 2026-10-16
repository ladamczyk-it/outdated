import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // CI sets `CI`, which makes picocolors emit ANSI codes and breaks string assertions.
    env: { NO_COLOR: '1' },
    coverage: {
      include: ['**/src'],
      exclude: ['**/*.spec.[jt]s', '**/__tests__/**', '**/types.ts', '**/lib/**', '**/*.d.ts'],
    },
  },
});
