/**
 * Collapse whitespace the way testing-library and jest-dom normalise DOM
 * text. Catalogs and Intl output use no-break spaces (French "1 234",
 * "Quitter X ?"), which the DOM side turns into plain spaces, so expected
 * strings need the same treatment.
 */
export function normalized(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Match an accessible name or text that contains a message, for elements
 * whose name joins the message with a count or hint. Escaped so translated
 * punctuation is matched literally. Any whitespace matches any whitespace,
 * because DOM text collapses no-break spaces but accessible names keep them.
 */
export function containing(text: string): RegExp {
  return new RegExp(
    normalized(text)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/ /g, '\\s+'),
  );
}
