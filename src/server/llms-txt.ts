/**
 * `/llms.txt`: a short Markdown index of the board for language models
 * (https://llmstxt.org): the board name, a one-line description, and links
 * to the Markdown twins of its main pages (src/lib/markdown-twin/routes.ts).
 *
 * Links are absolute on the board's published origin, in the board
 * language's URL words, like the sitemap. Pages the board does not serve
 * (a blog that is off, an about or legal page with no content, the MCP
 * server when it is off) are left out, under the rule each page's twin
 * 404s by. The pricing page always renders, so its twin is always listed.
 * Served and cached like robots.txt.
 */
import { BOARD_PATHS } from '@cavuno/board/paths';

import { breadcrumbsCopy } from '../copy-groups/breadcrumbs';
import { localizePath } from '../lib/localized-path';
import { markdownPathFor } from '../lib/markdown-twin/routes';
import {
  ROBOTS_CACHE_CONTROL,
  SEO_FILE_CONTENT_TYPE,
} from '../lib/seo-handlers';
import { escapeInline } from './markdown-twin/format';

export interface LlmsTxtInput {
  /** The board's published origin, no trailing slash. */
  origin: string;
  boardName: string;
  /** One line about the board; left out when empty. */
  description: string;
  blogEnabled: boolean;
  /** Whether the about page has content (its twin 404s without). */
  aboutEnabled: boolean;
  mcpEnabled: boolean;
  /** Legal pages that have content, by canonical path. */
  legalPaths: ReadonlyArray<
    | typeof BOARD_PATHS.privacyPolicy
    | typeof BOARD_PATHS.termsOfService
    | typeof BOARD_PATHS.cookiePolicy
    | typeof BOARD_PATHS.impressum
  >;
}

function twinLink(origin: string, label: string, canonicalPath: string) {
  const url = `${origin}${markdownPathFor(localizePath(canonicalPath))}`;
  return `- [${escapeInline(label)}](${url})`;
}

export function llmsTxtBody(input: LlmsTxtInput): string {
  const labels = breadcrumbsCopy();
  const legalLabels = {
    [BOARD_PATHS.privacyPolicy]: labels.privacyPolicy,
    [BOARD_PATHS.termsOfService]: labels.termsOfService,
    [BOARD_PATHS.cookiePolicy]: labels.cookiePolicy,
    [BOARD_PATHS.impressum]: labels.impressum,
  };
  const { origin } = input;
  const pages = [
    twinLink(origin, labels.home, '/'),
    twinLink(origin, labels.jobs, BOARD_PATHS.jobs),
    twinLink(origin, labels.companies, BOARD_PATHS.companies),
    twinLink(origin, labels.salaries, BOARD_PATHS.salaries),
    input.blogEnabled ? twinLink(origin, labels.blog, BOARD_PATHS.blog) : null,
    input.aboutEnabled
      ? twinLink(origin, labels.about, BOARD_PATHS.about)
      : null,
    twinLink(origin, labels.pricing, '/pricing'),
    input.mcpEnabled ? `- [MCP](${origin}/mcp/server-card)` : null,
  ];
  const description = input.description.replace(/\s+/g, ' ').trim();
  return [
    `# ${escapeInline(input.boardName)}`,
    description ? `> ${escapeInline(description)}` : null,
    pages.filter((line) => line !== null).join('\n'),
    input.legalPaths
      .map((path) => twinLink(origin, legalLabels[path], path))
      .join('\n') || null,
  ]
    .filter((block) => block !== null)
    .join('\n\n')
    .concat('\n');
}

export function llmsTxtResponse(body: string, method = 'GET'): Response {
  return new Response(method.toUpperCase() === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': SEO_FILE_CONTENT_TYPE,
      'Cache-Control': ROBOTS_CACHE_CONTROL,
    },
  });
}
