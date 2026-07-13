/**
 * Open Graph image — 1200×630 card for the job-detail page, the starter's
 * counterpart to the hosted `…/og` route (a `@takumi-rs` ImageResponse). The
 * two renderers (takumi-rs vs workers-og/satori) can't be pixel-identical, so
 * the parity bar is content + dimensions + capability: same card, same info
 * (logo · title · company · location · salary). Rendered in the Cloudflare
 * Worker runtime via `workers-og` (satori + resvg-wasm + HTMLRewriter).
 */
import { createFileRoute, notFound } from '@tanstack/react-router'
import { ImageResponse, loadGoogleFont } from 'workers-og'

import { isNotFound } from '@cavuno/board'
import { themeTokens } from '../theme/resolved'
import { formatSalaryRange, locationLabel } from '@cavuno/board/format'

import { getBoard } from '../lib/board'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export const Route = createFileRoute('/companies/$companySlug/jobs/$jobSlug/og')(
  {
    server: {
      handlers: {
        GET: async ({ params }) => {
          let job
          try {
            job = await getBoard().jobs.retrieve(params.jobSlug)
          } catch (error) {
            if (isNotFound(error)) throw notFound()
            throw error
          }

          // Board language for the display labels — the context read is
          // cached by the SDK client, so this adds no extra request in
          // steady state.
          const { language } = await getBoard().context()

          const title = job.title
          const company = job.company?.name ?? ''
          const location = locationLabel(language, job)
          const salary =
            formatSalaryRange(
              language,
              job.salaryMin,
              job.salaryMax,
              job.salaryTimeframe,
              job.salaryCurrency,
            ) ?? ''
          const logo = job.company?.logoUrl ?? null

          // Subset the font to exactly the glyphs the card renders.
          const text = [title, company, location, salary].join(' ')
          const font = await loadGoogleFont({ family: 'Inter', weight: 600, text })

          const metaParts = [location, salary].filter(Boolean).map(escapeHtml)

          // Board theme (ADR-0065 D2): Satori can't read CSS variables, so
          // the card renders from the resolved tokens module derived from
          // the canonical src/theme.css. Light values by rule.
          const t = themeTokens.light
          const html = `
            <div style="display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:80px;background:${t['--background']};font-family:Inter;">
              <div style="display:flex;align-items:center;gap:24px;">
                ${
                  logo
                    ? `<img src="${escapeHtml(logo)}" width="96" height="96" style="border-radius:16px;object-fit:contain;border:1px solid ${t['--border']};" />`
                    : ''
                }
                <div style="display:flex;font-size:32px;color:${t['--muted-foreground']};">${escapeHtml(company)}</div>
              </div>
              <div style="display:flex;font-size:72px;font-weight:600;color:${t['--foreground']};line-height:1.1;">${escapeHtml(title)}</div>
              <div style="display:flex;gap:16px;font-size:32px;color:${t['--foreground-subtle'] ?? t['--foreground']};">
                ${metaParts.map((part) => `<div style="display:flex;">${part}</div>`).join(`<div style="display:flex;color:${t['--border']};">·</div>`)}
              </div>
            </div>`

          return new ImageResponse(html, {
            width: 1200,
            height: 630,
            fonts: [
              { name: 'Inter', data: font, weight: 600, style: 'normal' },
            ],
          })
        },
      },
    },
  },
)
