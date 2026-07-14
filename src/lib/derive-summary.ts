/**
 * Honest one-line summary: the first sentence of the job's real
 * description (HTML stripped), truncated at a word boundary — never
 * invented copy about a real employer (direction-C stress fix S6).
 * Returns null when there is nothing honest to show (the line is
 * omitted). SSR-safe: plain string work, no DOM.
 */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function deriveSummary(html: string | null | undefined): string | null {
  if (!html) return null;
  // Stress fix S7: pad tag boundaries so adjacent blocks don't fuse
  // into "OverviewWe're hiring…" when the HTML is stripped to text.
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  // Stress fix S8: forager descriptions can lead with unrendered ATS
  // template tokens ("Requisition ID: [[id]]…") — omit the line instead
  // of surfacing broken boilerplate.
  if (text.slice(0, 200).includes('[[')) return null;
  const sentence = /^(.{20,160}?[.!?])(?:\s|$)/.exec(text)?.[1];
  if (sentence) return sentence;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 150);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
