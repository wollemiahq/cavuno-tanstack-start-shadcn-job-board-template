import { cloudflare } from '@cloudflare/vite-plugin';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Builder sandbox preview proxy: the page is served at
  // https://<port>-<session>-<token>.preview.cavuno.com (edge :443,
  // TLS) while vite listens on plain-http :5173 inside the container.
  // Vite's default HMR client would dial ws://<host>:5173 — mixed
  // content on an https page AND a port nothing terminates at the
  // edge — so the socket never connects and the preview goes
  // permanently stale (no live updates during a run, no refresh after
  // it). With clientPort 443 + wss the client dials the same
  // per-session preview hostname it was loaded from, and the sandbox
  // host passes WebSocket upgrades through to vite untouched.
  // Gated on the env var the builder's /serve command sets so local
  // `npm run dev` keeps vite's defaults.
  ...(process.env.CAVUNO_PREVIEW_PROXIED === '1'
    ? { server: { hmr: { protocol: 'wss' as const, clientPort: 443 } } }
    : {}),
  plugins: [
    // Compile-time i18n: messages/{locale}.json → tree-shakeable
    // functions in src/paraglide (generated; gitignored). Messages are
    // generated from the SDK uiCopy catalog — `pnpm run gen:messages`.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
