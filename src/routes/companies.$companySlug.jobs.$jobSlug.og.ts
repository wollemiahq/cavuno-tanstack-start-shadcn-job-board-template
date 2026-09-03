/**
 * Open Graph image — 1200×630 card for the job-detail page, the starter's
 * counterpart to the hosted `…/og` route (a `@takumi-rs` ImageResponse). The
 * two renderers (takumi-rs vs workers-og/satori) can't be pixel-identical, so
 * the parity bar is content + dimensions + capability: same card, same info
 * (logo · title · company · location · salary). Rendered in the Cloudflare
 * Worker runtime via `workers-og` (satori + resvg-wasm + HTMLRewriter).
 */
import { createFileRoute } from '@tanstack/react-router';

import { getBoard } from '../lib/board';
import { readBoardContext } from '../lib/board-context-cache';
import { loadOgFont } from '../lib/og-font';
import { ogNotFoundResponse, ogUnavailableResponse } from '../lib/og-http';
import { ogImageSrc } from '../lib/og-image';
import { renderOgPng } from '../lib/og-render';
import { ogStyleValue, ogText, ogUrlAttr } from '../lib/og-text';
import { ogThemeTokens } from '../lib/og-theme';

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
        // language, font subset, satori). Any fault there is a 503 — never
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
  const { language } = await readBoardContext();

  const title = job.title;
  const company = job.company?.name ?? '';
  const location = locationLabel(job, language);
  const salary =
    formatJobSalary(
      language,
      job.salaryMin,
      job.salaryMax,
      job.salaryTimeframe,
      job.salaryCurrency,
    ) ?? '';

  // Subset the theme font to exactly the glyphs the card renders. The logo
  // resolves alongside it; `null` drops the frame (see og-image.ts).
  const text = [title, company, location, salary].join(' ');
  const [font, logo] = await Promise.all([
    loadOgFont(text),
    ogImageSrc(job.company?.logoUrl),
  ]);

  const metaParts = [location, salary].filter(Boolean).map(ogText);

  // Satori can't read CSS variables or OKLCH colours, so the card renders
  // from the resolved tokens module derived from the canonical src/theme.css,
  // converted to sRGB. Light values by rule.
  const t = ogThemeTokens();
  const html = `
            <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:80px;background:${t['--background']};font-family:${ogStyleValue(font.name)};">
              <div style="display:flex;align-items:center;gap:24px;">
                ${
                  logo
                    ? `<img src="${ogUrlAttr(logo)}" width="96" height="96" style="border-radius:16px;object-fit:contain;border:1px solid ${t['--border']};" />`
                    : ''
                }
                <div style="display:flex;font-size:32px;color:${t['--muted-foreground']};">${ogText(company)}</div>
              </div>
              <div style="display:flex;font-size:72px;font-weight:600;color:${t['--foreground']};line-height:1.1;">${ogText(title)}</div>
              <div style="display:flex;gap:16px;font-size:32px;color:${t['--foreground-subtle'] ?? t['--foreground']};">
                ${metaParts.map((part) => `<div style="display:flex;">${part}</div>`).join(`<div style="display:flex;color:${t['--border']};">·</div>`)}
              </div>
            </div>`;

  return renderOgPng(html, font);
}
