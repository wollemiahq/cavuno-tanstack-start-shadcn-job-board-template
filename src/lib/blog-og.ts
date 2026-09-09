/** Pure 1200×630 blog card markup for Takumi's HTML renderer. */
import {
  OG_META_SEPARATOR,
  ogStyleValue,
  ogText,
  ogTextDirection,
  ogUrlAttr,
  truncateOgTitle,
} from './og-text';

/** Cap to `max` glyphs (ellipsis included), so text never overflows the frame. */
export const truncate = truncateOgTitle;

export interface BlogOgCard {
  boardName: string;
  /** Localized "Blog" eyebrow word (board language), joined as "{board} · {blogLabel}". */
  blogLabel: string;
  /** Board primary colour (hex), painted as the accent bar. */
  themeColor: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  /** Pre-formatted published date, or `null` to omit. */
  dateLabel: string | null;
  /** Font stack registered by the route. */
  fontFamily?: string;
}

export function buildBlogOgHtml(card: BlogOgCard): string {
  const fontFamily = ogStyleValue(card.fontFamily ?? 'Inter');
  const title = ogText(truncate(card.title, 70));
  const excerpt = card.excerpt ? ogText(truncate(card.excerpt, 140)) : null;
  const boardName = ogText(card.boardName);
  const blogLabel = ogText(card.blogLabel);
  const authorName = card.authorName ? ogText(card.authorName) : null;
  const dateLabel = card.dateLabel ? ogText(card.dateLabel) : null;
  const avatar = card.authorAvatarUrl ? ogUrlAttr(card.authorAvatarUrl) : null;
  const themeColor = ogStyleValue(card.themeColor);

  const footerLines = [
    authorName
      ? `<div dir="${ogTextDirection(card.authorName ?? '')}" style="display:flex;font-size:28px;font-weight:600;color:#111827;">${authorName}</div>`
      : '',
    dateLabel
      ? `<div dir="${ogTextDirection(card.dateLabel ?? '')}" style="display:flex;font-size:24px;color:#6b7280;">${dateLabel}</div>`
      : '',
  ].join('');

  return `
    <div style="display:flex;flex-direction:column;width:1200px;height:630px;background:#ffffff;font-family:${fontFamily};font-weight:600;">
      <div style="display:flex;width:1200px;height:14px;background:${themeColor};"></div>
      <div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;padding:72px 80px;">
        <div style="display:flex;flex-direction:column;gap:28px;">
          <div style="display:flex;font-size:28px;color:#6b7280;">${boardName} ${OG_META_SEPARATOR} ${blogLabel}</div>
          <div dir="${ogTextDirection(card.title)}" style="display:flex;font-size:64px;font-weight:600;color:#111827;line-height:1.1;">${title}</div>
          ${
            excerpt
              ? `<div dir="${ogTextDirection(card.excerpt ?? '')}" style="display:flex;font-size:30px;color:#374151;line-height:1.35;">${excerpt}</div>`
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
