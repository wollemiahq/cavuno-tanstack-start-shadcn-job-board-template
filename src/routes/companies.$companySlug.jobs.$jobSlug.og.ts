/** 1200×630 job share card rendered in the Cloudflare Worker via Takumi WASM. */
import { createFileRoute } from '@tanstack/react-router';

import { getBoard } from '../lib/board';
import { readBoardContext } from '../lib/board-context-cache';
import { buildJobOgHtml } from '../lib/job-og';
import { loadOgFont, ogFontStack } from '../lib/og-font';
import { ogNotFoundResponse, ogUnavailableResponse } from '../lib/og-http';
import { ogImageSrc } from '../lib/og-image';
import { renderOgPng } from '../lib/og-render';
import { ogSubsetText, truncateOgTitle } from '../lib/og-text';
import { readPublicOrigin } from '../lib/public-origin';

import { initialsOf } from '@/lib/initials';
import { locationLabel } from '@/lib/location-labels';
import { formatJobSalary } from '@/lib/salary-display';

export const Route = createFileRoute(
  '/companies/$companySlug/jobs/$jobSlug/og',
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let job;
        try {
          job = await getBoard().jobs.retrieve(params.jobSlug);
        } catch {
          // A miss must be HTTP 404 (not 200 `{isNotFound:true}` from
          // `throw notFound()` in a server GET).
          return ogNotFoundResponse();
        }

        // Everything after the slug resolved is renderer plumbing (board
        // language, font subset, rendering). Any fault there is a 503 — never
        // an unhandled 500 — because the slug is known to exist.
        try {
          return await renderJobOg(job);
        } catch (error) {
          // Tenant Workers log to Cloudflare observability; without this line
          // a renderer fault is invisible (see og-render.ts).
          console.error('[og] job card render failed', error);
          return ogUnavailableResponse();
        }
      },
    },
  },
});

type Job = Awaited<ReturnType<ReturnType<typeof getBoard>['jobs']['retrieve']>>;

async function renderJobOg(job: Job): Promise<Response> {
  // Board language for the display labels — served from the isolate
  // context memo / edge cache, so this adds no extra request in
  // steady state.
  // Nothing below needs the logo, so start it here and await it last.
  // Missing or unreadable logos use the same initials fallback as job cards.
  const logoSrc = ogImageSrc(job.company?.logoUrl);
  const [{ language, name }, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  const hostname = new URL(origin).hostname;

  // Bound the share-card title without changing the full job-page heading.
  const title = truncateOgTitle(job.title, 80);
  const company = job.company?.name ?? name;
  const initials = initialsOf(company) ?? initialsOf(name) ?? '';
  const location = locationLabel(job, language);
  const salary =
    formatJobSalary(
      language,
      job.salaryMin,
      job.salaryMax,
      job.salaryTimeframe,
      job.salaryCurrency,
    ) ?? '';

  const text = ogSubsetText([
    title,
    company,
    initials,
    location,
    salary,
    hostname,
  ]);
  const font = await loadOgFont(text, undefined, language);
  const logo = await logoSrc;

  const html = buildJobOgHtml({
    title,
    company,
    initials,
    salary,
    location,
    hostname,
    logo,
    fontFamily: ogFontStack(font),
  });

  return renderOgPng(html, font);
}
