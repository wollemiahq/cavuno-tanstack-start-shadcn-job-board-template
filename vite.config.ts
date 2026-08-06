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
    //
    // This plugin generating `src/paraglide` is NOT enough on its own for
    // `dev`, which is why package.json carries a `predev`. `src/paraglide`
    // is gitignored, so a fresh checkout starts without it; Vite's
    // dependency SCAN then races this plugin's first compile and reports
    // `@/paraglide/messages` and `@/paraglide/runtime` unresolved. Vite
    // treats a failed scan as fatal for optimization — it skips dependency
    // pre-bundling for the whole session — which leaves two copies of React
    // in the SSR graph and every route 500s with "Invalid hook call" /
    // "Cannot read properties of null (reading 'useMemo')" out of
    // DirectionProvider. The symptom names React, not i18n, so it reads as
    // a dependency problem and sends you to the wrong place entirely.
    //
    // `build` is unaffected: the scanner is a dev-only optimization, and
    // the production build resolves through this plugin normally.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // Match TanStack's Start + Paraglide reference explicitly: one module
      // per message lets Vite discard route-owned translations instead of
      // retaining a whole locale catalog in the universal client entry.
      outputStructure: 'message-modules',
      // URL only: documents carry the locale as a path prefix; server-fn
      // RPCs (unprefixed) get the viewer's locale from a per-request header
      // (src/lib/locale-middleware.ts) that the server entry turns into a
      // detection-only URL prefix. No cookie — a cookie is browser-global
      // while locale is per-tab.
      strategy: ['url', 'baseLocale'],
    }),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      router: {
        codeSplittingOptions: {
          // Private/application routes are not part of the public landing
          // workload. Keep each route's loader beside its already-lazy UI so
          // those server-function stubs do not inflate every public entry.
          splitBehavior: ({ routeId }) =>
            /^\/(?:account(?:_|\/|$)|alerts(?:\/|$)|auth(?:\/|$)|employers(?:\/|$)|me(?:\/|$)|messages(?:\/|$)|post(?:\/|$)|settings(?:\/|$))/.test(
              routeId,
            )
              ? [['loader', 'component']]
              : undefined,
        },
      },
      server: {
        build: {
          // The root stylesheet is a manifest-managed side-effect import, so
          // Start can place its critical route CSS in the SSR document and
          // remove the render-blocking stylesheet round trip on first load.
          inlineCss: true,
        },
      },
    }),
    viteReact(),
  ],
});

export default config;
