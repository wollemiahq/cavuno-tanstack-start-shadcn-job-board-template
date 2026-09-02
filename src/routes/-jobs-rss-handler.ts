import { jobDetailPath } from '@cavuno/board/paths';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '@/lib/board';
import { enumLabel } from '@/lib/enum-labels';
import { jobTitleAtCompany } from '@/lib/page-title';
import { readPublicOrigin } from '@/lib/public-origin';
import { m } from '@/paraglide/messages';
import { baseLocale, getLocale, isLocale } from '@/paraglide/runtime';

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function sanitizeCdata(value: string): string {
  return value.replaceAll(']]>', ']]&gt;');
}

function rssDate(iso: string | null): string {
  return (iso ? new Date(iso) : new Date(0)).toUTCString();
}

type JobsRssJob = Awaited<
  ReturnType<ReturnType<typeof getBoard>['jobs']['list']>
>['data'][number];

export type JobsRssBoard = {
  context: () => Promise<{ name: string; language: string }>;
  jobs: {
    list: (input: {
      fields: string;
      limit: number;
    }) => Promise<{ data: JobsRssJob[] }>;
  };
};

export type JobsRssDependencies = {
  getBoard: () => JobsRssBoard;
  getRequest: () => Request;
  /**
   * Board-published origin for the feed's own address and every item link
   * (ADR-0098) — a feed reached on `slug.cavuno.app` while a custom domain
   * is active still points at the custom domain. The locale redirect below
   * deliberately keeps the REQUEST origin: it sends the caller back to the
   * host they asked, it is not a canonical.
   */
  readPublicOrigin: () => Promise<string>;
};

const defaultDependencies: JobsRssDependencies = {
  getBoard,
  getRequest,
  readPublicOrigin,
};

export function createJobsRssHandler(
  dependencies: JobsRssDependencies = defaultDependencies,
) {
  return async () => {
    if (getLocale() !== baseLocale) {
      const requestOrigin = new URL(dependencies.getRequest().url).origin;
      return Response.redirect(`${requestOrigin}/jobs/rss.xml`, 308);
    }
    const origin = await dependencies.readPublicOrigin();
    const board = dependencies.getBoard();
    const [context, list] = await Promise.all([
      board.context(),
      board.jobs.list({ fields: '+description', limit: 50 }),
    ]);
    const locale = isLocale(context.language)
      ? { locale: context.language }
      : undefined;
    const jobs = [...list.data].sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    );
    const items = jobs
      .filter((job) => job.company)
      .map((job) => {
        const company = job.company!;
        const url = `${origin}${jobDetailPath(company.slug, job.slug)}`;
        const title = jobTitleAtCompany(
          context.language,
          job.title,
          company.name,
        );
        const parts: string[] = [];
        parts.push(m.rssJobs_companyLine({ name: company.name }, locale));
        if (job.employmentType) {
          const typeLabel = enumLabel(job.employmentType, context.language);
          if (typeLabel)
            parts.push(m.rssJobs_typeLine({ type: typeLabel }, locale));
        }
        if (job.description) parts.push(job.description);
        const description = sanitizeCdata(parts.join(' — '));
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
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${xmlEscape(m.rssJobs_channelTitle({ name: context.name }, locale))}</title>\n    <link>${xmlEscape(`${origin}/`)}</link>\n    <description>${xmlEscape(m.rssJobs_channelDescription({ name: context.name }, locale))}</description>\n    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n    <atom:link href="${xmlEscape(`${origin}/jobs/rss.xml`)}" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`;
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  };
}
