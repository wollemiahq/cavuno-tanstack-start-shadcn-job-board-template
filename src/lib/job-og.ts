/** Pure job share-card composition, shared with the Unicode render smoke check. */
import {
  ogTextWidthUnits,
  ogTextDirection,
  ogStyleValue,
  ogText,
  ogUrlAttr,
} from './og-text';
import { ogThemeTokens } from './og-theme';

export interface JobOgCard {
  title: string;
  company: string;
  initials: string;
  salary: string;
  location: string;
  hostname: string;
  logo: string | null;
  fontFamily: string;
}

export function buildJobOgHtml({
  title,
  company,
  initials,
  salary,
  location,
  hostname,
  logo,
  fontFamily,
}: JobOgCard): string {
  const titleWidth = ogTextWidthUnits(title);
  const metaParts = [salary, location].filter(Boolean);
  // Resolved light-theme tokens preserve the card's existing colors.
  const t = ogThemeTokens();
  const html = `
    <div style="display:flex;width:1200px;height:630px;padding:32px;background:${t['--muted']};font-family:${ogStyleValue(fontFamily)};font-weight:600;">
      <div style="display:flex;flex-direction:column;width:100%;height:100%;padding:48px;border:1px solid ${t['--border']};border-radius:24px;background:${t['--card']};">
        <div style="display:flex;align-items:center;gap:20px;">
          <div dir="${ogTextDirection(initials)}" style="display:flex;align-items:center;justify-content:center;flex-shrink:0;width:72px;height:72px;border-radius:16px;background:${logo ? t['--card'] : t['--primary']};border:1px solid ${t['--border']};color:${t['--primary-foreground']};font-size:28px;">${
            logo
              ? `<img src="${ogUrlAttr(logo)}" width="56" height="56" style="border-radius:8px;object-fit:contain;" />`
              : ogText(initials)
          }</div>
          <div dir="${ogTextDirection(company)}" style="display:flex;font-size:28px;color:${t['--card-foreground']};">${ogText(company)}</div>
        </div>
        <div style="display:flex;flex:1;flex-direction:column;justify-content:center;padding:24px 0;">
          <div dir="${ogTextDirection(title)}" style="display:flex;font-size:${titleWidth > 55 ? 54 : 64}px;font-weight:600;color:${t['--card-foreground']};line-height:1.1;letter-spacing:${/[^\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}]/u.test(title) ? 0 : -2}px;margin-bottom:24px;">${ogText(title)}</div>
          <div style="display:flex;align-items:flex-start;flex-wrap:wrap;gap:4px 12px;">${metaParts
            .map(
              (part) =>
                `<div dir="${ogTextDirection(part)}" style="display:block;height:48px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;line-height:28px;padding:9px 16px;border-radius:8px;border:1px solid ${t['--border']};background:${t['--background']};font-size:22px;color:${t['--card-foreground']};">${ogText(part)}</div>`,
            )
            .join('')}</div>
        </div>
        <div style="display:flex;border-top:1px solid ${t['--border']};padding-top:24px;font-size:20px;color:${t['--muted-foreground']};"><div dir="ltr" style="display:flex;">${ogText(hostname)}</div></div>
      </div>
    </div>`;

  return html;
}
