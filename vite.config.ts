import { cloudflare } from '@cloudflare/vite-plugin';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import {
  PARAGLIDE_VITE_IS_SERVER,
  paraglideInputsDigest,
  readParaglideStamp,
} from './scripts/paraglide-dev-stamp.mjs';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OxlintConfig } from 'oxlint';
import type { ConfigEnv, Plugin } from 'vite';

const previewServer =
  process.env.CAVUNO_PREVIEW_PROXIED === '1'
    ? {
        // The sandbox preserves the public Host on WebSocket upgrades.
        // Vite validates that host before accepting the HMR connection.
        allowedHosts: ['.preview.cavuno.com', '.preview-dev.cavuno.com'],
        hmr: { protocol: 'wss' as const, clientPort: 443 },
      }
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
 * `messages/` holds the human-authored real catalogs and ignored QA
 * pseudo-locales. `project.inlang/settings.json` enables only `locales`
 * (today: `en`), while `pnpm locale:add` opts a real catalog in.
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

/**
 * Skip the plugin's startup compile when `gen:paraglide` already compiled
 * these exact inputs with these exact options (scripts/paraglide-dev-stamp.mjs).
 *
 * The builder runs `gen:paraglide` before every `vp dev`, and the plugin then
 * compiled the same project again: about two seconds of every boot. A
 * missing or stale stamp compiles as before.
 *
 * A skipped start has not read the inlang project, so the plugin's own
 * `watchChange` would ignore catalog edits. The first change under the
 * project or messages directory therefore runs the real startup compile,
 * which compiles the edit and hands watching back to the plugin.
 */
type ParaglideCompileOptions = Required<
  Pick<
    Parameters<typeof paraglideVitePlugin>[0],
    'outputStructure' | 'strategy' | 'isServer'
  >
>;

function paraglideSkipCompiledStart(
  plugin: ParaglidePlugin,
  compile: ParaglideCompileOptions,
): ParaglidePlugin {
  const outdir = resolve(import.meta.dirname, PARAGLIDE_OUTDIR);
  // Watch events arrive with forward slashes; compare like with like.
  const project = resolve(import.meta.dirname, INLANG_PROJECT).replaceAll(
    '\\',
    '/',
  );
  const messages = resolve(import.meta.dirname, 'messages').replaceAll(
    '\\',
    '/',
  );
  function wrap(one: Plugin): Plugin {
    const start = one.buildStart;
    const changed = one.watchChange;
    if (start === undefined || changed === undefined) {
      return one;
    }
    const startHandler = start instanceof Function ? start : start.handler;
    const changeHandler =
      changed instanceof Function ? changed : changed.handler;
    // The arguments of a skipped start, kept for the compile the first
    // catalog edit runs instead.
    let skippedStart: Parameters<typeof startHandler> | undefined;
    return {
      ...one,
      buildStart(
        this: ThisParameterType<typeof startHandler>,
        ...args: Parameters<typeof startHandler>
      ) {
        const stamp = readParaglideStamp(outdir);
        if (
          stamp !== null &&
          stamp === paraglideInputsDigest(INLANG_PROJECT, compile)
        ) {
          skippedStart = args;
          return;
        }
        return startHandler.apply(this, args);
      },
      async watchChange(
        this: ThisParameterType<typeof changeHandler>,
        ...args: Parameters<typeof changeHandler>
      ) {
        const path = args[0].replaceAll('\\', '/');
        if (
          skippedStart !== undefined &&
          (path.startsWith(`${project}/`) || path.startsWith(`${messages}/`))
        ) {
          const startArgs = skippedStart;
          skippedStart = undefined;
          await startHandler.apply(this, startArgs);
          return;
        }
        return changeHandler.apply(this, args);
      },
    };
  }

  return Array.isArray(plugin) ? plugin.map(wrap) : wrap(plugin);
}

function viteConfig(command: ConfigEnv['command']) {
  const paraglideCompile: ParaglideCompileOptions = {
    // Production matches TanStack's Start + Paraglide reference: one
    // module per message lets Rollup discard route-owned translations
    // instead of retaining a whole locale catalog in the universal
    // client entry.
    //
    // Dev is the opposite trade. Vite serves source unbundled, so
    // `message-modules` costs one HTTP request per message: a cold
    // five-locale page load measured 2,247 requests, 1,732 of them
    // paraglide modules (2026-09-08). Through the builder's sandbox
    // proxy that waterfall outlived the preview handshake and the pane
    // flickered between the dev preview and last-saved. One module
    // per locale makes that a handful of requests — the split
    // paraglide itself recommends (compiler-options: "locale-modules
    // for development and message-modules for production").
    outputStructure: command === 'serve' ? 'locale-modules' : 'message-modules',
    // URL only: documents carry the locale as a path prefix; server-fn
    // RPCs (unprefixed) get the viewer's locale from a per-request header
    // (src/lib/locale-middleware.ts) that the server entry turns into a
    // detection-only URL prefix. No cookie — a cookie is browser-global
    // while locale is per-tab.
    strategy: ['url', 'baseLocale'],
    // The plugin's default under Vite, pinned so `gen:paraglide` writes the
    // same runtime (scripts/paraglide-dev-stamp.mjs).
    isServer: PARAGLIDE_VITE_IS_SERVER,
  };
  const paraglide = paraglideEnabledLocalesOnly(
    paraglideVitePlugin({
      project: INLANG_PROJECT,
      outdir: PARAGLIDE_OUTDIR,
      ...paraglideCompile,
    }),
  );

  return defineConfig({
    define: {
      'import.meta.env.CAVUNO_HOSTED_PREVIEW': JSON.stringify(
        process.env.CAVUNO_PREVIEW_PROXIED === '1',
      ),
    },
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
    // Boot time. The builder's readiness probe and a preview's first view
    // SSR `/` in workerd, whose module runner pulls the graph one import at
    // a time; warming the SSR entry and the landing routes starts that work
    // while Vite is still coming up. Measured on 4 CPUs (median of 3,
    // 2026-09-23): first `/` render 18.1 s -> 17.6 s, inside the noise.
    // `preTransformRequests` here reached 16.0 s but logs a false
    // "Pre-transform error" for the Cloudflare plugin's compiled-wasm
    // modules (the OG renderer) on every boot, which reads as a real error
    // in the preview's logs. Client files are not warmed: on the same CPUs
    // they delay the SSR render (20.2 s).
    environments: {
      ssr: {
        dev: {
          warmup: [
            './src/server.ts',
            './src/router.tsx',
            './src/routes/__root.tsx',
            './src/routes/index.tsx',
            './src/routes/jobs.index.tsx',
          ],
        },
      },
    },
    plugins: [
      // Compile-time i18n: messages/{locale}.json → tree-shakeable
      // functions in src/paraglide (generated; gitignored). Real catalogs
      // are authored in messages/; `gen:messages` only prepares ignored QA
      // pseudo-locales when the runtime gate needs them.
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
      command === 'serve'
        ? paraglideSkipCompiledStart(paraglide, paraglideCompile)
        : paraglide,
      devtools({
        // Console piping POSTs every browser console call to
        // /__tsd/console-pipe on the dev server. Behind the hosted preview
        // proxy nobody reads that terminal, and a failing pipe request looks
        // like a page error. Local `pnpm dev` keeps it.
        consolePiping: {
          enabled: process.env.CAVUNO_PREVIEW_PROXIED !== '1',
        },
      }),
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
            // Keep font faces in a persistent, fingerprinted stylesheet.
            // Inline CSS is rewritten by HeadContent during navigation, even
            // when unchanged, which recreates FontFace objects and flashes
            // fallback text. External CSS costs one cold-load request, then
            // public/_headers lets browsers reuse it across page changes.
            inlineCss: false,
          },
        },
      }),
      viteReact(),
    ],
  });
}

export default ({ command }: ConfigEnv) => ({
  ...viteConfig(command),
  lint: antiSlopLint,
});
