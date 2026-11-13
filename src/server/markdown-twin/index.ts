/**
 * Serves a Markdown twin (see src/lib/markdown-twin/routes.ts) from the
 * internal twin route: resolves the original `.md` URL again, runs the
 * page kind's builder, and answers with the twin headers.
 *
 * Cache headers are not set here: the server entry adds the same public
 * cache policy it gives HTML pages (src/lib/public-html-cache.ts), so the
 * platform edge cache treats a twin exactly like its page.
 */
import { isRedirect, redirect } from '@tanstack/react-router';

import {
  markdownTwinRequestUrl,
  resolveMarkdownTwin,
  type MarkdownTwin,
  type MarkdownTwinKind,
} from '../../lib/markdown-twin/routes';
import { buildBlogPostTwin, buildBlogTagTwin, buildBlogTwin } from './blog';
import {
  buildCompaniesTwin,
  buildCompanyJobsTwin,
  buildCompanyMarketTwin,
  buildCompanyTwin,
} from './companies';
import { buildHomeTwin } from './home';
import { buildJobTwin } from './job-detail';
import {
  buildJobsCategoryTwin,
  buildJobsLocationCategoryTwin,
  buildJobsLocationSkillTwin,
  buildJobsLocationTwin,
  buildJobsLocationsTwin,
  buildJobsSkillTwin,
  buildJobsTwin,
} from './jobs-listings';

import type { MarkdownTwinResult } from './result';

export type MarkdownTwinBuilder = (
  twin: MarkdownTwin,
  origin: string,
) => Promise<MarkdownTwinResult>;

export type MarkdownTwinBuilders = Record<
  MarkdownTwinKind,
  MarkdownTwinBuilder
>;

const BUILDERS = {
  home: (twin, origin) => buildHomeTwin(twin, origin),
  jobs: (twin, origin) => buildJobsTwin(twin, origin),
  jobsCategory: (twin, origin) => buildJobsCategoryTwin(twin, origin),
  jobsSkill: (twin, origin) => buildJobsSkillTwin(twin, origin),
  jobsLocations: (twin, origin) => buildJobsLocationsTwin(twin, origin),
  jobsLocation: (twin, origin) => buildJobsLocationTwin(twin, origin),
  jobsLocationCategory: (twin, origin) =>
    buildJobsLocationCategoryTwin(twin, origin),
  jobsLocationSkill: (twin, origin) => buildJobsLocationSkillTwin(twin, origin),
  job: (twin, origin) => buildJobTwin(twin, origin),
  companies: (twin, origin) => buildCompaniesTwin(twin, origin),
  companyMarket: (twin, origin) => buildCompanyMarketTwin(twin, origin),
  company: (twin, origin) => buildCompanyTwin(twin, origin),
  companyJobs: (twin, origin) => buildCompanyJobsTwin(twin, origin),
  blog: (twin, origin) => buildBlogTwin(twin, origin),
  blogPost: (twin, origin) => buildBlogPostTwin(twin, origin),
  blogTag: (twin, origin) => buildBlogTagTwin(twin, origin),
} satisfies MarkdownTwinBuilders;

export const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

function twinHeaders(contentType: string): Headers {
  return new Headers({
    'Content-Type': contentType,
    'X-Robots-Tag': 'noindex',
    Vary: 'Accept, Cookie',
  });
}

function notFoundResponse(): Response {
  return new Response('Not Found\n', {
    status: 404,
    headers: twinHeaders('text/plain; charset=utf-8'),
  });
}

/** The builder's answer as a response. */
export function markdownTwinResponse(result: MarkdownTwinResult): Response {
  if (result.type === 'notFound') return notFoundResponse();
  if (result.type === 'redirect') {
    return new Response(null, {
      status: 308,
      headers: { Location: result.location },
    });
  }
  const headers = twinHeaders(MARKDOWN_CONTENT_TYPE);
  headers.set('Link', `<${result.canonical}>; rel="canonical"`);
  return new Response(result.body, { status: 200, headers });
}

/** Answer the twin route's request. */
export async function serveMarkdownTwin(
  request: Request,
  builders: MarkdownTwinBuilders = BUILDERS,
): Promise<Response> {
  const url = markdownTwinRequestUrl(request.url);
  const twin = resolveMarkdownTwin({ method: request.method, url: url.href });
  if (!twin) return notFoundResponse();
  try {
    return markdownTwinResponse(await builders[twin.kind](twin, url.origin));
  } catch (error) {
    // The password wall names the page to return to; for a twin that is
    // the `.md` URL, not the internal route the request was rewritten to.
    if (isRedirect(error) && error.options.to === '/password') {
      throw redirect({
        to: '/password',
        search: { redirect: `${twin.twinPath}${url.search}` },
      });
    }
    throw error;
  }
}
