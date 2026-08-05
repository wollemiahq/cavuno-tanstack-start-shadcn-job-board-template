/**
 * site.webmanifest — the board-specific PWA manifest.
 *
 * 4.0.0 dropped `icons` and `manifest.themeColor` from `board.seo()`; the
 * starter owns icon paths (public assets) and theme color from the theme.
 */
import { createFileRoute } from '@tanstack/react-router';

import { getBoard } from '../lib/board';
import { themeTokens } from '../theme/resolved';

export const Route = createFileRoute('/site.webmanifest')({
  server: {
    handlers: {
      GET: async () => {
        const { manifest } = await getBoard().seo();

        const doc = {
          name: manifest.name,
          short_name: manifest.name,
          start_url: '/',
          display: 'standalone',
          background_color: themeTokens.light['--background'],
          theme_color: themeTokens.light['--background'],
          icons: [
            { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo512.png', sizes: '512x512', type: 'image/png' },
          ],
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
