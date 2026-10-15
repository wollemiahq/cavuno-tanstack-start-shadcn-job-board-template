import { describe, expect, it } from 'vitest';

import {
  loadShellEntryAfterStyles,
  wrapStartManifestModule,
} from '../scripts/shell-entry-after-styles-plugin.mjs';

/**
 * The client shell must not be discoverable by the preload scanner, or it
 * downloads alongside the render-blocking CSS and delays the first paint
 * on slow connections. Its route chunk preloads must stay.
 */

const builtManifest = () => ({
  routes: {
    __root__: {
      preloads: ['/assets/index-abc.js', '/assets/shared-def.js'],
      scripts: [
        {
          attrs: { type: 'module', async: true, src: '/assets/index-abc.js' },
        },
      ],
      css: ['/assets/index-abc.css'],
    },
    '/blog/$postSlug': { preloads: ['/assets/blog._postSlug-ghi.js'] },
  },
});

describe('loadShellEntryAfterStyles', () => {
  it('loads the entry from an inline script and drops its preload', () => {
    const manifest = loadShellEntryAfterStyles(builtManifest());

    expect(manifest.routes.__root__).toEqual({
      preloads: ['/assets/shared-def.js'],
      scripts: [{ children: 'import("/assets/index-abc.js")' }],
      css: ['/assets/index-abc.css'],
    });
    expect(manifest.routes['/blog/$postSlug']).toEqual(
      builtManifest().routes['/blog/$postSlug'],
    );
  });

  it('drops a preload given as a link object', () => {
    const source = builtManifest();
    const manifest = loadShellEntryAfterStyles({
      ...source,
      routes: {
        ...source.routes,
        __root__: {
          ...source.routes.__root__,
          preloads: [
            { href: '/assets/index-abc.js', crossOrigin: 'anonymous' },
          ],
        },
      },
    });

    expect(manifest.routes.__root__.preloads).toEqual([]);
  });

  it('leaves a manifest without a module entry as it is', () => {
    const manifest = {
      routes: {
        __root__: { preloads: ['/assets/a.js'], css: ['/assets/a.css'] },
      },
    };

    expect(loadShellEntryAfterStyles(manifest)).toBe(manifest);
  });
});

describe('wrapStartManifestModule', () => {
  it('routes the generated export through the rewrite', async () => {
    const code = `export const tsrStartManifest = () => (${JSON.stringify(builtManifest())})`;
    const wrapped = wrapStartManifestModule(code);
    const module: {
      tsrStartManifest: () => ReturnType<typeof builtManifest>;
    } = await import(`data:text/javascript,${encodeURIComponent(wrapped)}`);

    expect(module.tsrStartManifest().routes.__root__.scripts).toEqual([
      { children: 'import("/assets/index-abc.js")' },
    ]);
  });

  it('fails the build when the module shape changes', () => {
    expect(() =>
      wrapStartManifestModule('export function tsrStartManifest() {}'),
    ).toThrow(/no longer starts with/);
  });
});
