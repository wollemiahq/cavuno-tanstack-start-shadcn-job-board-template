import { defineConfig } from 'vitest/config';

import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // fileURLToPath, not `.pathname`: that percent-encodes, so a checkout
      // under a path with a space resolves to nothing and every env-touching
      // suite silently stops collecting — the exact failure this alias fixes.
      'cloudflare:workers': fileURLToPath(
        new URL('./src/test/cloudflare-workers-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
