/**
 * site.webmanifest — the board-specific PWA manifest, assembled from the Board
 * API's SEO icons + manifest metadata (ADR-0039: the API serves the data, the
 * starter builds the document). Mirrors the hosted board's /site.webmanifest.
 */
import { createFileRoute } from '@tanstack/react-router';

import { getBoard } from '../lib/board';

export const Route = createFileRoute('/site.webmanifest')({
  server: {
    handlers: {
      GET: async () => {
        const { manifest, icons } = await getBoard().seo();
        const manifestIcons = [
          icons.icon192
            ? { src: icons.icon192, sizes: '192x192', type: 'image/png' }
            : null,
          icons.icon512
            ? { src: icons.icon512, sizes: '512x512', type: 'image/png' }
            : null,
          icons.iconMaskable512
            ? {
                src: icons.iconMaskable512,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              }
            : null,
        ].filter(Boolean);

        const doc = {
          name: manifest.name,
          short_name: manifest.name,
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: manifest.themeColor,
          icons: manifestIcons,
        };

        return new Response(JSON.stringify(doc), {
          headers: {
            'content-type': 'application/manifest+json; charset=utf-8',
            'cache-control':
              'public, max-age=300, stale-while-revalidate=86400',
          },
        });
      },
    },
  },
});
