import {
  parseBucketFilename,
  renderSitemapIndex,
  renderUrlset,
} from '@cavuno/board/sitemap';

import { getPrimaryBoard } from '../lib/board';
import { readPublicOrigin } from '../lib/public-origin';
import {
  LOCALIZED_BUCKETS,
  renderUrlsetWithAlternates,
} from '../lib/sitemap-alternates';
import {
  findSitemapChunk,
  loadSitemapContext,
  sitemapIndexLocations,
  sitemapXmlResponse,
} from '../lib/sitemap-context';

import type { SitemapContext } from '../lib/sitemap-context';
import type { BoardSdk } from '@cavuno/board';

// `throw notFound()` inside a server handler serializes as a 200 JSON
// body — crawlers need a REAL 404 status for unknown sitemap files.
const notFoundResponse = () => new Response('Not found', { status: 404 });

export type SitemapHandlerDependencies = {
  getPrimaryBoard: () => BoardSdk;
  /**
   * The board's published canonical origin — sitemap `<loc>`s must name the
   * same origin the pages canonicalize to (ADR-0098), so a board served on
   * `slug.cavuno.app` while a custom domain is active lists the custom
   * domain, exactly as the hosted board's sitemap does.
   */
  readPublicOrigin: () => Promise<string>;
  loadSitemapContext: (
    board: BoardSdk,
    origin: string,
  ) => Promise<SitemapContext>;
};

const defaultDependencies: SitemapHandlerDependencies = {
  getPrimaryBoard,
  readPublicOrigin,
  loadSitemapContext,
};

export function createSitemapIndexHandler(
  dependencies: SitemapHandlerDependencies = defaultDependencies,
) {
  return async () => {
    const origin = await dependencies.readPublicOrigin();
    // Public discovery is deployment truth, never the preview data-source
    // cookie a signed-in operator may carry.
    const board = dependencies.getPrimaryBoard();
    const context = await dependencies.loadSitemapContext(board, origin);
    const locs = sitemapIndexLocations(origin, context);
    return sitemapXmlResponse(renderSitemapIndex(locs));
  };
}

export function createSitemapFileHandler(
  dependencies: SitemapHandlerDependencies = defaultDependencies,
) {
  return async ({ params }: { params: { file: string } }) => {
    const parsed = parseBucketFilename(params.file);
    if (!parsed) return notFoundResponse();

    const origin = await dependencies.readPublicOrigin();
    const context = await dependencies.loadSitemapContext(
      dependencies.getPrimaryBoard(),
      origin,
    );
    const slice = findSitemapChunk(context, parsed.bucket, parsed.chunkIndex);
    if (!slice) return notFoundResponse();

    // Self-canonical buckets carry xhtml:link locale alternates so
    // crawlers can DISCOVER /de/ and /fr/, not just infer them from
    // page-level hreflang. External-canonical buckets stay plain.
    const xml = LOCALIZED_BUCKETS.includes(parsed.bucket)
      ? renderUrlsetWithAlternates(slice, origin)
      : renderUrlset(slice);
    return sitemapXmlResponse(xml);
  };
}
