import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // The real package throws outside a React Server Components build.
      'server-only': path.resolve(
        import.meta.dirname,
        'src/test/server-only.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Each database test file starts its own in-memory Postgres and migrates it.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
