import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'cloudflare:workers': new URL(
        './src/test/cloudflare-workers-stub.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
