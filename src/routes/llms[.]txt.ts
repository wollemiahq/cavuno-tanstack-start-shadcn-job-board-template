/**
 * `/llms.txt`: the board's Markdown index for language models, linking the
 * Markdown twins of its main pages. See ../server/llms-txt.ts.
 *
 * Like robots.txt it is a discovery file for the whole deployment: it reads
 * the primary board (never a demo cookie's board) and is not behind the
 * board access gate.
 */
import { BOARD_PATHS } from '@cavuno/board/paths';
import { createFileRoute } from '@tanstack/react-router';

import { resolveLegalContent } from '../content/legal';
import { impressumHasContent } from '../content/legal/impressum-availability';
import { getPrimaryBoard } from '../lib/board';
import { readPrimaryPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { resolveHomeCopy } from '../server/home-copy';
import { llmsTxtBody, llmsTxtResponse } from '../server/llms-txt';

const LEGAL_PAGES = [
  ['privacy-policy', BOARD_PATHS.privacyPolicy],
  ['terms-of-service', BOARD_PATHS.termsOfService],
  ['cookie-policy', BOARD_PATHS.cookiePolicy],
  ['impressum', BOARD_PATHS.impressum],
] as const;

async function handle(request: Request): Promise<Response> {
  const [context, origin] = await Promise.all([
    getPrimaryBoard().context(),
    readPrimaryPublicOrigin(),
  ]);
  // The home page's meta description, without the counts it never reads
  // here; the footer's default line when the operator left it empty.
  const description =
    resolveHomeCopy({
      boardName: context.name,
      jobsCount: null,
      companiesCount: null,
      postsCount: null,
      talentCount: null,
    }).metaDescription ||
    m.footer_defaultDescription({ board_name: context.name });
  const body = llmsTxtBody({
    origin,
    boardName: context.name,
    description,
    blogEnabled: context.features.blog === true,
    // The about page's loader 404s without content, as its twin does.
    aboutEnabled: resolveLegalContent('about') !== null,
    mcpEnabled: context.features.mcp === true,
    // The rule each legal page's loader applies before it 404s.
    legalPaths: LEGAL_PAGES.flatMap(([type, path]) =>
      resolveLegalContent(type) !== null &&
      (type !== 'impressum' || impressumHasContent())
        ? [path]
        : [],
    ),
  });
  return llmsTxtResponse(body, request.method);
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      HEAD: ({ request }) => handle(request),
    },
  },
});
