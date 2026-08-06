/**
 * site.webmanifest — board-specific PWA manifest.
 *
 * Name + icon URLs come from `board.context()` (brand identity). Theme color
 * stays app-owned (theme tokens). Do not read icons from `board.seo()`.
 */
import { createFileRoute } from '@tanstack/react-router';

import { readBoardContext } from '../lib/board-context-cache';
import { boardManifestIcons } from '../lib/board-icons';
import { themeTokens } from '../theme/resolved';

export const Route = createFileRoute('/site.webmanifest')({
  server: {
    handlers: {
      GET: async () => {
        // Same per-isolate context cache as the root shell — no extra hop.
        const board = await readBoardContext();
        const name = board.name?.trim() || 'Board';

        const doc = {
          name,
          short_name: name,
          start_url: '/',
          display: 'standalone',
          background_color: themeTokens.light['--background'],
          theme_color: themeTokens.light['--background'],
          icons: boardManifestIcons(board),
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
