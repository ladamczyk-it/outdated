import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['**/src'],
      exclude: ['**/*.spec.[jt]s', '**/__tests__/**', '**/types.ts', '**/lib/**', '**/*.d.ts'],
    },
  },
});
