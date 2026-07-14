import { jobDetailPath } from '@cavuno/board/paths';
/**
 * Jobs RSS — hosted-parity feed at /jobs/rss.xml. Mirrors the hosted
 * `buildJobRssFeed`: the latest 50 published jobs (publishedAt desc), each item
 * carrying a CDATA description (Company / Type / the job's HTML), category tags,
 * and the canonical `/companies/:co/jobs/:slug` link. Descriptions come from the
 * API via the Medusa-style `?fields=+description` sparse-fieldset opt-in — the
 * slim card omits them by default.
 */
import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function rssDate(iso: string | null): string {
  return (iso ? new Date(iso) : new Date(0)).toUTCString();
}

function formatEmploymentType(type: string): string {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute('/jobs/rss.xml')({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(getRequest().url).origin;
        const board = getBoard();
        const [context, list] = await Promise.all([
          board.context(),
          board.jobs.list({ fields: '+description', limit: 50 }),
        ]);

        // Feed convention: latest first (the hosted feed orders by publishedAt desc).
        const jobs = [...list.data].sort(
          (a, b) =>
            new Date(b.publishedAt ?? 0).getTime() -
            new Date(a.publishedAt ?? 0).getTime(),
        );

        const items = jobs
          .map((job) => {
            const url = job.company
              ? `${origin}${jobDetailPath(job.company.slug, job.slug)}`
              : `${origin}/jobs/${job.slug}`;
            const title = job.company
              ? `${job.title} at ${job.company.name}`
              : job.title;
            const parts: string[] = [];
            if (job.company) parts.push(`Company: ${job.company.name}`);
            if (job.employmentType)
              parts.push(`Type: ${formatEmploymentType(job.employmentType)}`);
            if (job.description) parts.push(job.description);
            const description = parts.join(' — ');
            const categories = job.categories
              .map(
                (category) =>
                  `      <category>${xmlEscape(category.name)}</category>`,
              )
              .join('\n');
            return `    <item>\n      <title>${xmlEscape(title)}</title>\n      <link>${xmlEscape(url)}</link>\n      <guid isPermaLink="true">${xmlEscape(url)}</guid>\n      <pubDate>${rssDate(job.publishedAt)}</pubDate>\n${description ? `      <description><![CDATA[${description}]]></description>\n` : ''}${categories ? `${categories}\n` : ''}    </item>`;
          })
          .join('\n');

        const lastBuildDate = jobs[0]
          ? rssDate(jobs[0].publishedAt)
          : new Date(0).toUTCString();

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${xmlEscape(`${context.name} — Jobs`)}</title>\n    <link>${xmlEscape(`${origin}/`)}</link>\n    <description>${xmlEscape(`Latest job listings from ${context.name}.`)}</description>\n    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n    <atom:link href="${xmlEscape(`${origin}/jobs/rss.xml`)}" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`;

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          },
        });
      },
    },
  },
});
