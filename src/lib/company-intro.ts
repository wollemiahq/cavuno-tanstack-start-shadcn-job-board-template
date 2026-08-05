/**
 * Company-intro derivation for job detail pages — formerly
 * `@cavuno/board/format` `companyIntro`. Application-owned chrome words /
 * HTML→text shaping (ADR-0101).
 *
 * A curated one-line `summary` wins when present; otherwise the first
 * sentence of the `description` HTML, stripped to plain text. `null` when
 * there's nothing usable.
 *
 * `<script>`/`<style>` blocks are removed BEFORE tag stripping — stripping
 * only the tags would leave their JS/CSS body text as candidate intro
 * copy. HTML entities are decoded so a company like `AT&amp;T` reads `AT&T`.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(input: string): string {
  return input.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, body) => {
    const token = String(body);
    if (token[0] === '#') {
      const code =
        token[1] === 'x' || token[1] === 'X'
          ? parseInt(token.slice(2), 16)
          : parseInt(token.slice(1), 10);
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[token.toLowerCase()] ?? match;
  });
}

export function companyIntro(
  summary: string | null,
  description: string | null,
): string | null {
  const trimmedSummary = summary?.trim();
  if (trimmedSummary) return trimmedSummary;

  if (!description) return null;

  const text = decodeEntities(
    description
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  const [first] = text.split(/(?<=[.!?])\s+/);
  return first ?? text;
}
