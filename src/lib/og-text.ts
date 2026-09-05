/**
 * Text and attribute sanitisers for OG card markup rendered by `workers-og`.
 *
 * workers-og turns the HTML string into a Satori tree with Cloudflare's
 * HTMLRewriter, and HTMLRewriter hands text nodes over RAW — character
 * references are NOT decoded. Classic `escapeHtml` therefore paints
 * `&amp;` literally on the card (and the `;` falls outside the font subset,
 * so it shows as a tofu box). The only characters that can break the
 * structure of a text node are `<` and `>`; strip those and leave `&` and
 * quotes alone.
 */
export function ogText(value: string): string {
  return value.replaceAll(/[<>]/g, '');
}

/**
 * A URL for an attribute value (`src="…"`). Percent-encode the three
 * characters that could terminate the attribute or open a tag; `&` must stay
 * raw so query strings survive (HTMLRewriter would not decode `&amp;`).
 */
export function ogUrlAttr(value: string): string {
  return value
    .replaceAll('"', '%22')
    .replaceAll('<', '%3C')
    .replaceAll('>', '%3E');
}

/** A CSS identifier-ish value inside `style="…"` (font family, colour). */
export function ogStyleValue(value: string): string {
  return value.replaceAll(/["<>;]/g, '');
}

/**
 * The separator painted between meta parts on the OG cards (job meta row,
 * blog eyebrow). Exported so the markup and the font subset can never drift:
 * a glyph the card paints but the subset omits renders as a tofu box (▯).
 */
export const OG_META_SEPARATOR = '·';

/**
 * The exact text to subset the Google font to for a card.
 *
 * Google Fonts' `text=` subsetting ships ONLY the requested glyphs, so every
 * character the card can paint has to be in here — including the separator
 * and the truncation ellipsis, which come from the markup rather than from
 * board content. Empty parts are dropped; the extras are always appended.
 */
export function ogSubsetText(
  parts: readonly (string | null | undefined)[],
  extras: readonly string[] = [OG_META_SEPARATOR],
): string {
  return [...parts.filter(Boolean), ...extras].join(' ');
}
