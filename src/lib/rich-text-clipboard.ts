/**
 * Clipboard / file import helpers for the shared rich-text editor.
 *
 * TipTap/ProseMirror will happily swallow a paste: Word HTML often parses to
 * an empty document, and CharacterCount `limit` rejects a transaction that
 * would exceed it. These helpers prefer visible plain text in those cases,
 * clip incoming text to the remaining budget so a long paste still lands up
 * to the cap, and turn a dropped .txt/.html/.md file into editor HTML — the
 * posting form has no server-side description parser.
 */

const WORD_HTML =
  /xmlns:o=|xmlns:w=|urn:schemas-microsoft-com:office|<!--\[if|class="?Mso|mso-ansi/i;

const IMPORTABLE_EXTENSIONS = new Set(['txt', 'html', 'htm', 'md', 'markdown']);

export function shouldPastePlainText(html: string, text: string): boolean {
  const trimmedText = text.trim();
  if (!trimmedText) return false;
  const trimmedHtml = html.trim();
  if (!trimmedHtml) return true;
  if (WORD_HTML.test(html)) return true;
  const visible = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s+/g, '');
  return visible.length === 0;
}

export function plainTextToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = escapeHtml(block.trim()).replace(/\n/g, '<br>');
      return `<p>${lines}</p>`;
    })
    .join('');
}

export function clipToCharacterBudget(text: string, remaining: number): string {
  if (remaining <= 0) return '';
  return text.length <= remaining ? text : text.slice(0, remaining);
}

export function remainingCharacterBudget(
  used: number,
  maxCharacters: number,
  selected = 0,
): number {
  const kept = Math.max(0, used - Math.max(0, selected));
  return Math.max(0, maxCharacters - kept);
}

export type PastedHtmlResolution =
  | { kind: 'default' }
  | { kind: 'ignore' }
  | { kind: 'insert'; html: string };

export function resolvePastedHtml(
  html: string,
  text: string,
  remaining: number,
): PastedHtmlResolution {
  if (remaining <= 0) return { kind: 'ignore' };
  const usePlain = shouldPastePlainText(html, text) || text.length > remaining;
  if (!usePlain) return { kind: 'default' };
  const clipped = clipToCharacterBudget(text, remaining);
  if (!clipped.trim()) return { kind: 'ignore' };
  return { kind: 'insert', html: plainTextToHtml(clipped) };
}

export function importedFileToHtml(
  filename: string,
  contents: string,
): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!IMPORTABLE_EXTENSIONS.has(extension)) return null;
  if (extension === 'html' || extension === 'htm') return contents;
  return plainTextToHtml(contents);
}

export function importedFileToClippedHtml(
  filename: string,
  contents: string,
  maxCharacters: number,
): string | null {
  const html = importedFileToHtml(filename, contents);
  if (html === null) return null;
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const source =
    extension === 'html' || extension === 'htm'
      ? contents
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : contents;
  if (source.length <= maxCharacters) return html;
  return plainTextToHtml(clipToCharacterBudget(source, maxCharacters));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
