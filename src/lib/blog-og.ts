/**
 * Blog OG card — the pure markup for the 1200×630 social image, split out
 * from the `workers-og` route (`blog.$postSlug.og.ts`) so it is unit-testable
 * without the Worker runtime (satori + resvg-wasm). Mirrors the hosted board's
 * blog OG card: a board-primary accent bar, the "{board} · Blog" eyebrow, the
 * title, an optional excerpt, and the author + published date footer.
 *
 * satori constraint: every `<div>` with children needs `display:flex`.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Cap to `max` glyphs (ellipsis included), so text never overflows the frame. */
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export interface BlogOgCard {
  boardName: string;
  /** Board primary colour (hex), painted as the accent bar. */
  themeColor: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  /** Pre-formatted published date, or `null` to omit. */
  dateLabel: string | null;
  /** Satori font name registered by the route (FNT-02: the theme font). */
  fontFamily?: string;
}

export function buildBlogOgHtml(card: BlogOgCard): string {
  const fontFamily = escapeHtml(card.fontFamily ?? 'Inter');
  const title = escapeHtml(truncate(card.title, 70));
  const excerpt = card.excerpt ? escapeHtml(truncate(card.excerpt, 140)) : null;
  const boardName = escapeHtml(card.boardName);
  const authorName = card.authorName ? escapeHtml(card.authorName) : null;
  const dateLabel = card.dateLabel ? escapeHtml(card.dateLabel) : null;
  const avatar = card.authorAvatarUrl ? escapeHtml(card.authorAvatarUrl) : null;
  const themeColor = escapeHtml(card.themeColor);

  const footerLines = [
    authorName
      ? `<div style="display:flex;font-size:28px;font-weight:600;color:#111827;">${authorName}</div>`
      : '',
    dateLabel
      ? `<div style="display:flex;font-size:24px;color:#6b7280;">${dateLabel}</div>`
      : '',
  ].join('');

  return `
    <div style="display:flex;flex-direction:column;width:1200px;height:630px;background:#ffffff;font-family:${fontFamily};">
      <div style="display:flex;width:1200px;height:14px;background:${themeColor};"></div>
      <div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;padding:72px 80px;">
        <div style="display:flex;flex-direction:column;gap:28px;">
          <div style="display:flex;font-size:28px;color:#6b7280;">${boardName} · Blog</div>
          <div style="display:flex;font-size:64px;font-weight:600;color:#111827;line-height:1.1;">${title}</div>
          ${
            excerpt
              ? `<div style="display:flex;font-size:30px;color:#374151;line-height:1.35;">${excerpt}</div>`
              : ''
          }
        </div>
        ${
          footerLines || avatar
            ? `<div style="display:flex;align-items:center;gap:20px;">
          ${
            avatar
              ? `<img src="${avatar}" width="64" height="64" style="border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;" />`
              : ''
          }
          <div style="display:flex;flex-direction:column;gap:4px;">${footerLines}</div>
        </div>`
            : ''
        }
      </div>
    </div>`;
}
