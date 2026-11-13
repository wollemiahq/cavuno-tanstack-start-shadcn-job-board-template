/**
 * Markdown building blocks for the twins: escaping for board content and
 * the API-sanitized HTML bodies converted to Markdown.
 *
 * `node-html-markdown` is imported here and nowhere else, so it stays in
 * the server bundle.
 */
import { NodeHtmlMarkdown } from 'node-html-markdown';

/** Settled converter (no I/O), reused across requests. */
const converter = new NodeHtmlMarkdown({ keepDataImages: false });

/** API-sanitized rich HTML (job, company and blog bodies) as Markdown. */
export function htmlToMarkdown(html: string): string {
  // Editors leave runs of `<br>` and empty paragraphs; drop the blank
  // lines they become so paragraphs stay one blank line apart.
  return converter
    .translate(html)
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Board content as one line of inline Markdown text, never markup. */
export function escapeInline(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>#|~]/g, '\\$&');
}

/** A Markdown link; the URL is kept inside its parentheses. */
export function link(text: string, url: string): string {
  const href = url.replace(/[\s()<>]/g, (char) => encodeURIComponent(char));
  return `[${escapeInline(text)}](${href})`;
}

/** Blocks joined by blank lines, empty ones dropped, one trailing newline. */
export function markdownDocument(
  blocks: ReadonlyArray<string | null | undefined | false>,
): string {
  return `${blocks.filter(Boolean).join('\n\n')}\n`;
}
