/**
 * Clipboard / file import helpers for the shared rich-text editor.
 *
 * TipTap/ProseMirror will happily swallow a paste: Word HTML often parses to
 * an empty document, and CharacterCount `limit` rejects the whole transaction
 * with no UI. These helpers prefer visible plain text in those cases and turn
 * a dropped .txt/.html/.md file into editor HTML — the posting form has no
 * server-side description parser.
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

export function importedFileToHtml(
  filename: string,
  contents: string,
): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!IMPORTABLE_EXTENSIONS.has(extension)) return null;
  if (extension === 'html' || extension === 'htm') return contents;
  return plainTextToHtml(contents);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
