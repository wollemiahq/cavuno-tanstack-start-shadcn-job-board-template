import { cloudflare } from '@cloudflare/vite-plugin';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OxlintConfig } from 'oxlint';
import type { Plugin } from 'vite';

const previewServer =
  process.env.CAVUNO_PREVIEW_PROXIED === '1'
    ? { hmr: { protocol: 'wss' as const, clientPort: 443 } }
    : undefined;

const antiSlopLint = {
  ignorePatterns: [
    '.agent/**',
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.continue/**',
    '.cursor/**',
    '.gemini/**',
    '.opencode/**',
    '.pi/**',
    '.roo/**',
    '.windsurf/**',
    'tools/oxlint/anti-slop/**',
  ],
  jsPlugins: [
    {
      name: 'anti-slop',
      specifier: './tools/oxlint/anti-slop/index.ts',
    },
  ],
  rules: {
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-conditional-empty-object-spread': 'error',
    'anti-slop/no-known-value-widening': 'error',
    'anti-slop/no-module-mocking': 'error',
    'anti-slop/no-object-parameters': 'error',
    'anti-slop/no-reflect-apply': 'error',
    'anti-slop/no-reflect-get': 'error',
    'anti-slop/no-runtime-typeof': 'error',
    'anti-slop/no-shape-in-symbol-names': 'error',
    'anti-slop/no-unknown-parameters': 'error',
    'anti-slop/no-unknown-returns': 'error',
    'anti-slop/no-unknown-type-aliases': 'error',
    'anti-slop/no-unsafe-dictionary-type': 'error',
    'anti-slop/no-widen-then-assert': 'error',
    'anti-slop/require-safety-comment-for-type-assertion': 'error',
  },
} satisfies OxlintConfig;

const INLANG_PROJECT = './project.inlang';
const PARAGLIDE_OUTDIR = './src/paraglide';

/**
 * Restrict the paraglide plugin's dev watch to catalogs it actually
 * compiles.
 *
 * `messages/` holds en, de, fr and the two pseudo-locales, but
 * `project.inlang/settings.json` enables only `locales` (today: `en`).
 * The dormant catalogs stay on disk so `pnpm locale:add` can flip one on
 * without starting from a blank file — see scripts/gen-paraglide-messages.mjs.
 *
 * The plugin derives its watch set from the files the inlang SDK read
 * during the last compile, then widens it to those files' *directories*
 * (unplugin.js → getWatchTargets, so a newly added catalog invalidates
 * too). Every write under `messages/` therefore takes the `watchChange`
 * path and recompiles all ~1570 message modules — including for locales
 * the compiler ignores, where the output is byte-identical. That write
 * storm into `src/paraglide` is what turns one edit into a cascade of
 * overlapping reloads, which kills the workerd runner with "Cannot read
 * properties of undefined (reading 'update') in runInRunnerObject" and the
 * dev server never comes back. (A single `[vite] program reload` per saved
 * file is normal here and unrelated — any file in the project produces
 * one.)
 *
 * The plugin exposes no option to narrow this (getWatchTargets takes an
 * `ignorePath`, but unplugin.js never passes one), so wrap `watchChange`
 * and drop events for catalogs of disabled locales. Anything that is not a
 * recognisable `pathPattern` catalog — settings.json itself, en.json, a
 * brand-new locale file — still falls through to the real hook.
 */
type ParaglidePlugin = ReturnType<typeof paraglideVitePlugin>;

function paraglideEnabledLocalesOnly(plugin: ParaglidePlugin): ParaglidePlugin {
  const settingsPath = resolve(
    import.meta.dirname,
    INLANG_PROJECT,
    'settings.json',
  );
  const settings: {
    locales?: string[];
    'plugin.inlang.messageFormat'?: { pathPattern?: string };
  } = JSON.parse(readFileSync(settingsPath, 'utf8'));
  const enabled = new Set(settings.locales ?? []);
  const pathPattern = settings['plugin.inlang.messageFormat']?.pathPattern;

  // Turn "./messages/{locale}.json" into a matcher over absolute paths.
  // Bail out (filter nothing) on a pattern shape we cannot reason about
  // rather than silently dropping events.
  const segments = pathPattern?.split('{locale}');
  if (segments === undefined || segments.length !== 2) {
    return plugin;
  }
  const prefix = segments[0];
  const suffix = segments[1];
  if (prefix === undefined || suffix === undefined) {
    return plugin;
  }
  // `resolve` drops a trailing separator, so resolve a dummy leaf and cut it.
  const absolutePrefix = resolve(import.meta.dirname, `${prefix}x`).slice(
    0,
    -1,
  );

  function normalize(id: string): string {
    return id.replaceAll('\\', '/');
  }

  function localeOf(id: string): string | undefined {
    const path = normalize(id);
    if (!path.startsWith(absolutePrefix) || !path.endsWith(suffix)) {
      return undefined;
    }
    const locale = path.slice(
      absolutePrefix.length,
      path.length - suffix.length,
    );
    return locale.length > 0 && !locale.includes('/') ? locale : undefined;
  }

  function wrap(one: Plugin): Plugin {
    const changed = one.watchChange;
    if (changed === undefined) {
      return one;
    }
    const handler = changed instanceof Function ? changed : changed.handler;
    return {
      ...one,
      watchChange(
        this: ThisParameterType<typeof handler>,
        ...args: Parameters<typeof handler>
      ) {
        const locale = localeOf(args[0]);
        if (locale !== undefined && !enabled.has(locale)) {
          return;
        }
        return handler.apply(this, args);
      },
    };
  }

  return Array.isArray(plugin) ? plugin.map(wrap) : wrap(plugin);
}

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
  server: previewServer,
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
    paraglideEnabledLocalesOnly(
      paraglideVitePlugin({
        project: INLANG_PROJECT,
        outdir: PARAGLIDE_OUTDIR,
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
    ),
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
          // Puts the stylesheet in the SSR document, removing the
          // render-blocking round trip on first load — which is what keeps
          // LCP inside budget on a cold visit.
          //
          // Be clear about the trade, because the name suggests otherwise:
          // this inlines the WHOLE stylesheet, not a per-route critical
          // subset (measured: 245KB raw / 36KB gzip, byte-identical on every
          // route, ~58% of the raw HTML of /jobs). A multi-page visit
          // re-sends it per document where an external file would be cached
          // once. Deliberate: first paint is the budgeted metric here, and
          // dist/client/assets/index-*.css is still emitted, so flipping
          // this back is a one-line change if that trade ever inverts.
          inlineCss: true,
        },
      },
    }),
    viteReact(),
  ],
});

export default { ...config, lint: antiSlopLint };
