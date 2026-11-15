/**
 * Wraps each top-level `<table>` of a pre-sanitized HTML string in a
 * horizontally scrollable container.
 *
 * A table cannot shrink below the width of its longest unbreakable cells,
 * so a wide one in a post or a description pushes the whole page sideways
 * on a phone. The wrapper (`.typeset-scroll-fit` in src/typeset.css) keeps
 * the overflow inside the table's own box. The table stays a real table.
 *
 * The API sanitizer strips `class` and `style`, so authors cannot add the
 * wrapper themselves. Only fixed markup is inserted here; no other string
 * is interpolated. `tabindex="0"` lets keyboard users scroll the region.
 * Regex-based (no DOM) so the server and the client render the same string.
 */
const TABLE_TAG = /<(\/?)table\b[^>]*>/gi;

const OPEN = '<div class="typeset-scroll-fit" tabindex="0">';
const CLOSE = '</div>';

export function withScrollableTables(html: string): string {
  let out = '';
  let last = 0;
  let depth = 0;

  for (const match of html.matchAll(TABLE_TAG)) {
    const index = match.index;
    const closing = match[1] === '/';

    if (!closing) {
      if (depth === 0) {
        out += html.slice(last, index) + OPEN;
        last = index;
      }
      depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0) {
        const end = index + match[0].length;
        out += html.slice(last, end) + CLOSE;
        last = end;
      }
    }
  }

  // An unclosed table keeps its wrapper open to the end; close it so the
  // markup stays balanced.
  return out + html.slice(last) + (depth > 0 ? CLOSE : '');
}
