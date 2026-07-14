/**
 * robots.txt / ads.txt / indexnow-key.txt response builders — byte-identical
 * to the hosted board's handlers (apps/web .../(main)/{robots,ads.txt,
 * indexnow-key.txt}/route.ts), fed by `board.seo()`. Pure functions so the
 * exact body + status + cache headers are unit-verifiable.
 */
import type { BoardSeo } from '@cavuno/board';

const TEXT_PLAIN = 'text/plain; charset=utf-8';

/**
 * `robots.txt`. The `Sitemap:` line uses the board's CANONICAL base (honours a
 * custom domain), NOT the request origin, and the body carries no `Disallow`
 * lines — matching the hosted handler exactly.
 */
export function robotsResponse(seo: Pick<BoardSeo, 'canonicalBase'>): Response {
  const body = [
    'User-Agent: *',
    'Allow: /',
    '',
    `Sitemap: ${seo.canonicalBase}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': TEXT_PLAIN,
      'Cache-Control':
        'public, max-age=600, s-maxage=14400, stale-while-revalidate=86400',
    },
  });
}

/** `ads.txt` — verbatim content, or 404 when the board has none configured. */
export function adsTxtResponse(seo: Pick<BoardSeo, 'adsTxt'>): Response {
  if (!seo.adsTxt) return new Response(null, { status: 404 });

  return new Response(seo.adsTxt, {
    headers: {
      'Content-Type': TEXT_PLAIN,
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}

/** `indexnow-key.txt` — the IndexNow key, or 404 when unconfigured. */
export function indexNowResponse(seo: Pick<BoardSeo, 'indexNowKey'>): Response {
  if (!seo.indexNowKey) return new Response(null, { status: 404 });

  return new Response(seo.indexNowKey, {
    headers: {
      'Content-Type': TEXT_PLAIN,
      'Cache-Control': 'public, max-age=86400, must-revalidate',
    },
  });
}
