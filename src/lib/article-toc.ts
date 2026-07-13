/**
 * Table-of-contents helpers for blog article HTML.
 *
 * The Board API returns the post body as a pre-sanitized HTML string of
 * `<h2>`/`<p>`/… structure. These two pure functions derive the "In this
 * article" rail from the `<h2>`s and inject matching anchor ids into the
 * body so the rail's `#id` links land on the right section. Both share one
 * slug+dedup pass so the ids they produce are always identical — regex-based
 * (no DOM) so they run the same on the server and the client.
 */
export interface TocEntry {
  id: string;
  text: string;
}

const H2 = /<h2([^>]*)>([\s\S]*?)<\/h2>/gi;
const EXISTING_ID = /\bid\s*=\s*["']([^"']*)["']/i;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "section"
  );
}

/** Reserve a unique id, appending `-2`, `-3`, … on collision. */
function uniqueId(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  used.add(id);
  return id;
}

interface ParsedHtml {
  entries: TocEntry[];
  html: string;
}

/**
 * Single source of truth: walk every `<h2>`, resolve its id (honouring an
 * explicit `id=` attribute, otherwise a deduped slug of its text), and emit
 * both the TOC entries and the html with ids injected where they were
 * missing. Empty-text headings are skipped from both outputs.
 */
function parse(html: string | null): ParsedHtml {
  if (!html) return { entries: [], html: "" };

  const entries: TocEntry[] = [];
  const used = new Set<string>();

  const out = html.replace(H2, (match, attrs: string, inner: string) => {
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return match;

    const existing = attrs.match(EXISTING_ID);
    if (existing) {
      const id = existing[1];
      used.add(id);
      entries.push({ id, text });
      return match;
    }

    const id = uniqueId(slugify(text), used);
    entries.push({ id, text });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  return { entries, html: out };
}

/** The `<h2>` headings of the post body, in document order. */
export function extractToc(html: string | null): TocEntry[] {
  return parse(html).entries;
}

/** The post body with a stable anchor `id` on every `<h2>` that lacked one. */
export function withHeadingAnchors(html: string | null): string {
  return parse(html).html;
}
