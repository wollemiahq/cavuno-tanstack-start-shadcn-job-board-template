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

const VOID_TAGS = new Set(['br', 'hr']);
const DROPPED_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'template',
  'noscript',
  'svg',
  'math',
  'textarea',
  'select',
]);
// A comment opener, or a whole tag. As in HTML, a quote opens a value only
// after `=` (a stray quote elsewhere is just a character), and a quoted value
// may hold `>`. Unquoted parts cannot cross `<`, so a tag that never closes
// costs a scan to the next `<`, not to the end of the body.
const TOKEN =
  /<!--|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:=\s*(?:"[^"]*"|'[^']*')|=(?!\s*["'])|[^<>=])*)>/g;
const ATTRIBUTE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>]+))/g;
const LINK_ATTRIBUTES = new Set(['href', 'title', 'target', 'rel']);
// Protocol-relative (`//host`, `/\host`, `\\host`) is rejected: browsers read
// `\` as `/`.
const SAFE_HREF =
  /^(?:https?:|mailto:|tel:|[#?]|\/(?![/\\])|\.{1,2}\/|[^:/?#\\]+(?:[/?#]|$))/i;
const NAMED_ENTITIES = new Map([
  ['&amp;', '&'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&lt;', '<'],
  ['&gt;', '>'],
]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Text between tags. Only `<` and `>` are escaped, so a stray `<` can never
 * start a tag and the source's own entities (`&amp;`) are kept as written.
 * The board name is escaped in full.
 */
function renderText(text: string, boardName: string): string {
  return text
    .split(BOARD_NAME_TOKEN)
    .map((part) => part.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .join(escapeHtml(boardName));
}

function linkAttributes(raw: string, boardName: string): string {
  const kept: string[] = [];
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = match[1]!.toLowerCase();
    if (!LINK_ATTRIBUTES.has(name)) continue;
    // Validate and re-escape the value as the browser will read it.
    const value = (match[3] ?? match[4] ?? match[5] ?? '')
      .replace(
        /&(?:amp|quot|#39|lt|gt);/g,
        (entity) => NAMED_ENTITIES.get(entity) ?? entity,
      )
      .replace(BOARD_NAME_TOKEN, () => boardName);
    // Numeric references (`java&#115;cript:`) are not decoded, and
    // `escapeHtml` turns their `&` into `&amp;`, so the browser reads them
    // literally: a relative path, never a scheme.
    // Browsers drop tabs and newlines inside a URL before reading it.
    if (
      name === 'href' &&
      !SAFE_HREF.test(value.trim().replace(/[\t\n\r]/g, ''))
    )
      continue;
    kept.push(`${name}="${escapeHtml(value)}"`);
  }
  return kept.length > 0 ? ` ${kept.join(' ')}` : '';
}

/**
 * Sanitize a legal body and fill in the board name.
 *
 * One pass over the input: allowed tags are rebuilt from scratch, every other
 * tag and comment is dropped, and text is escaped, so nothing removed can
 * leave a tag behind. Tags are balanced against a stack: a closer with no
 * open tag is dropped and tags still open at the end are closed, so a body
 * cannot swallow the page around it.
 */
export function renderLegalHtml(html: string, boardName: string): string {
  let out = '';
  let position = 0;
  const open: string[] = [];
  const token = new RegExp(TOKEN);
  for (let match = token.exec(html); match; match = token.exec(html)) {
    out += renderText(html.slice(position, match.index), boardName);
    position = token.lastIndex;
    if (match[0] === '<!--') {
      // `<!-->` and `<!--->` close at once; an unclosed comment drops the
      // rest of the body.
      const abrupt = /-?>/y;
      abrupt.lastIndex = position;
      if (abrupt.test(html)) {
        position = abrupt.lastIndex;
      } else {
        const end = html.indexOf('-->', position);
        position = end === -1 ? html.length : end + 3;
      }
      token.lastIndex = position;
      continue;
    }
    const [, closing, rawName, rest] = match;
    const name = rawName!.toLowerCase();
    if (DROPPED_WITH_CONTENT.has(name)) {
      if (closing) continue;
      const closer = new RegExp(`</${name}\\s*>`, 'gi');
      closer.lastIndex = position;
      position = closer.exec(html) ? closer.lastIndex : html.length;
      token.lastIndex = position;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue;
    if (VOID_TAGS.has(name)) {
      if (!closing) out += `<${name}>`;
      continue;
    }
    if (closing) {
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      for (const tag of open.splice(index).reverse()) out += `</${tag}>`;
      continue;
    }
    const attributes = name === 'a' ? linkAttributes(rest!, boardName) : '';
    out += `<${name}${attributes}>`;
    // `<div/>` is an empty element, not an open one. A `/` that ends an
    // unquoted value (`href=https://x.com/`) belongs to the value.
    if (/(?:^|[\s"'])\/\s*$/.test(rest!)) out += `</${name}>`;
    else open.push(name);
  }
  out += renderText(html.slice(position), boardName);
  for (const tag of open.reverse()) out += `</${tag}>`;
  return out;
}

/** Fill in the board name in plain-text fields (title, description). */
export function renderLegalText(text: string, boardName: string): string {
  return text.replace(BOARD_NAME_TOKEN, () => boardName);
}
