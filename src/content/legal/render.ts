/**
 * Legal bodies are HTML strings: the starter's own text, an operator's
 * migrated policy, or a machine translation of either. None of them is Board
 * API HTML, so this module is the one place that makes them safe to render.
 *
 * - `{{board_name}}` is the only token. Its value is HTML-escaped in the body
 *   and inserted as plain text in title and description.
 * - The body keeps an allowlist of text-formatting tags. Other tags are
 *   removed (`script`, `style`, `iframe` and similar together with their
 *   contents). Every attribute is dropped except `href`, `title`, `target`
 *   and `rel` on links, and an `href` must be http(s), mailto, tel, a
 *   fragment or a relative path.
 */

const BOARD_NAME_TOKEN = /{{\s*board_name\s*}}/g;

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const DROPPED_WITH_CONTENT =
  /<(script|style|iframe|object|embed|template|noscript|svg|math|textarea|select)\b[\s\S]*?<\/\1\s*>/gi;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
const COMMENT = /<!--[\s\S]*?-->/g;
const ATTRIBUTE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
const LINK_ATTRIBUTES = new Set(['href', 'title', 'target', 'rel']);
const SAFE_HREF =
  /^(?:https?:|mailto:|tel:|#|\/(?!\/)|\.{0,2}\/|[^:/?#]+(?:[/?#]|$))/i;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linkAttributes(raw: string): string {
  const kept: string[] = [];
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = match[1]!.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    if (!LINK_ATTRIBUTES.has(name)) continue;
    // Entity-encoded schemes (`java&#115;cript:`) never pass the allowlist,
    // because the decoded character is not part of a permitted prefix.
    if (name === 'href' && !SAFE_HREF.test(value.trim())) continue;
    kept.push(`${name}="${escapeHtml(value)}"`);
  }
  return kept.length > 0 ? ` ${kept.join(' ')}` : '';
}

/** Sanitize a legal body and fill in the board name. */
export function renderLegalHtml(html: string, boardName: string): string {
  return html
    .replace(COMMENT, '')
    .replace(DROPPED_WITH_CONTENT, '')
    .replace(TAG, (_tag, closing: string, rawName: string, rest: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      if (closing) return `</${name}>`;
      const attributes = name === 'a' ? linkAttributes(rest) : '';
      return `<${name}${attributes}${/\/\s*$/.test(rest) ? ' /' : ''}>`;
    })
    .replace(BOARD_NAME_TOKEN, () => escapeHtml(boardName));
}

/** Fill in the board name in plain-text fields (title, description). */
export function renderLegalText(text: string, boardName: string): string {
  return text.replace(BOARD_NAME_TOKEN, () => boardName);
}
