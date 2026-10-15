/**
 * Start the client shell's download once the stylesheet has loaded.
 *
 * TanStack Start puts the client entry in the page twice: a
 * `<link rel="modulepreload">` in the head and a
 * `<script type="module" async src>` in the body. The browser's preload
 * scanner finds both as soon as the HTML arrives, so the shell JS (about
 * 205 KiB gzip) downloads alongside the render-blocking CSS (about 36 KiB)
 * and the page's hero image. On a slow phone connection they share the
 * bandwidth: the CSS took 0.8 s instead of 0.2 s, and nothing paints until
 * it is in (blog post on a 1.6 Mbps, 150 ms, 4x CPU profile, 2026-10-15).
 * `fetchpriority="low"` did not help in that test: Chrome's throttling
 * divides bandwidth evenly between requests, and Chrome does not hold back
 * low-priority requests to HTTP/2 hosts.
 *
 * The browser does wait for stylesheets before running a parser-inserted
 * inline classic script. So the entry becomes `<script>import("…")</script>`,
 * which the preload scanner cannot see and which runs as soon as the CSS
 * has loaded, and the entry's modulepreload is dropped. Route chunk
 * preloads stay: they are small, and without them the route's code would
 * only be requested after the shell runs.
 *
 * The change is made to Start's server manifest, not to the HTML, because
 * the client re-renders the body scripts from the dehydrated copy of that
 * manifest during hydration; both sides then render the same script.
 *
 * Production builds only. The dev server's entry is not in this manifest.
 */

const MANIFEST_MODULE_ID = '\0tanstack-start-manifest:v';
const MANIFEST_EXPORT = 'export const tsrStartManifest = () =>';

/**
 * Turn the root route's module entry scripts into inline loaders and drop
 * their modulepreloads. Any other shape is returned unchanged, so the page
 * loads as before.
 *
 * Serialized into the server bundle with `Function.prototype.toString`, so
 * it must not use anything outside its own body.
 *
 * @template {{ routes: Record<string, { preloads?: unknown[]; scripts?: { attrs?: Record<string, unknown>; children?: string }[] }> }} M
 * @param {M} manifest
 * @returns {M}
 */
export function loadShellEntryAfterStyles(manifest) {
  const rootRoute = manifest.routes.__root__;
  const scripts = rootRoute?.scripts ?? [];
  /** @type {string[]} */
  const entries = [];
  const nextScripts = scripts.map((script) => {
    const src = script.attrs?.src;
    // Start's generated manifest is this function's input: this decodes it.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (script.attrs?.type !== 'module' || typeof src !== 'string') {
      return script;
    }
    entries.push(src);
    return { children: `import(${JSON.stringify(src)})` };
  });
  if (rootRoute === undefined || entries.length === 0) return manifest;
  return {
    ...manifest,
    routes: {
      ...manifest.routes,
      __root__: {
        ...rootRoute,
        preloads: (rootRoute.preloads ?? []).filter(
          (preload) =>
            !entries.includes(
              // A preload is a URL, or `{ href, crossOrigin }` when an asset
              // transform sets one.
              // oxlint-disable-next-line anti-slop/no-runtime-typeof
              typeof preload === 'string'
                ? preload
                : (/** @type {{ href?: string }} */ (preload).href ?? ''),
            ),
        ),
        scripts: nextScripts,
      },
    },
  };
}

/**
 * Rewrite the generated manifest module so its export goes through
 * `loadShellEntryAfterStyles`. Throws when the module no longer has the
 * shape this expects, so a TanStack Start upgrade that changes it fails the
 * build instead of silently restoring the old loading order.
 *
 * @param {string} code
 * @returns {string}
 */
export function wrapStartManifestModule(code) {
  if (!code.includes(MANIFEST_EXPORT)) {
    throw new Error(
      `shell-entry-after-styles: the start manifest module no longer starts with "${MANIFEST_EXPORT}". Update scripts/shell-entry-after-styles-plugin.mjs for this TanStack Start version.`,
    );
  }
  return [
    code.replace(MANIFEST_EXPORT, 'const baseStartManifest = () =>'),
    `const loadShellEntryAfterStyles = ${loadShellEntryAfterStyles.toString()};`,
    'export const tsrStartManifest = () => loadShellEntryAfterStyles(baseStartManifest());',
  ].join('\n');
}

/** @returns {import('vite').Plugin} */
export function shellEntryAfterStylesPlugin() {
  return {
    name: 'cavuno:shell-entry-after-styles',
    apply: 'build',
    transform: {
      filter: { id: /^\0tanstack-start-manifest:v$/ },
      handler(code, id) {
        if (id !== MANIFEST_MODULE_ID) return;
        return { code: wrapStartManifestModule(code), map: null };
      },
    },
  };
}
