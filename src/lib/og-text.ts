/** Escape text for Takumi's HTML parser without dropping visible characters. */
export function ogText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Escape a URL inside a double-quoted HTML attribute. */
export function ogUrlAttr(value: string): string {
  return ogText(value).replaceAll('"', '&quot;');
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

/** Segment user-visible characters, keeping accents and emoji sequences intact. */
export function ogGraphemes(value: string): string[] {
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
    ({ segment }) => segment,
  );
}

export function truncateOgText(value: string, max: number): string {
  if (max <= 0) return '';
  const characters = ogGraphemes(value);
  return characters.length <= max
    ? value
    : `${characters
        .slice(0, max - 1)
        .join('')
        .trimEnd()}…`;
}

/** Conservative line budget: full-width scripts and emoji need more room. */
export function ogTextWidthUnits(value: string): number {
  return ogGraphemes(value).reduce(
    (total, character) =>
      total +
      (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(
        character,
      )
        ? 2
        : 1),
    0,
  );
}

export function truncateOgTitle(value: string, max: number): string {
  if (ogTextWidthUnits(value) <= max) return value;
  let result = '';
  let used = 0;
  for (const character of ogGraphemes(value)) {
    const width = ogTextWidthUnits(character);
    if (used + width > max - 1) break;
    result += character;
    used += width;
  }
  return max > 0 ? `${result.trimEnd()}…` : '';
}

/** Layout follows the board language; Unicode bidi handles mixed text within it. */
export function ogDirection(language: string): 'rtl' | 'ltr' {
  return /^(ar|he|fa|ur|ps|dv|yi)(-|$)/i.test(language) ? 'rtl' : 'ltr';
}

/** Isolate each field's paragraph direction from the surrounding card layout. */
export function ogTextDirection(value: string): 'rtl' | 'ltr' {
  const firstLetter = value.match(/\p{Letter}/u)?.[0] ?? '';
  return /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(
    firstLetter,
  )
    ? 'rtl'
    : 'ltr';
}
