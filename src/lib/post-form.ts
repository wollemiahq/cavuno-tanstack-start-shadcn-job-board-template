/**
 * Pure helpers for the post-a-job form (src/routes/post.tsx). Kept out of
 * the route so the URL-normalisation and rich-text-emptiness seams can be
 * unit-tested without rendering the form.
 */

/**
 * Prepend `https://` to a bare domain typed into a URL field that renders
 * with an `https://` leading addon (the poster types `acme.com`). A value
 * that already carries an `http(s)` protocol is returned untouched; an
 * empty value becomes `undefined` so the field submits as absent.
 */
export function ensureProtocol(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Strip any protocol and path, leaving the bare host (for logo lookup). */
export function toDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
}

/** Whether a value looks enough like a domain to auto-fetch a logo for it. */
export function looksLikeDomain(value: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(toDomain(value))
}

/**
 * Normalise a URL typed into the rich-text link popover: bare domains gain
 * `https://`, existing `http(s)` URLs pass through, and any other explicit
 * scheme (`javascript:`, `mailto:`, …) is rejected so a link mark can never
 * carry a script URL. Empty input returns `undefined` (used to unset).
 */
export function sanitizeLinkUrl(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // A scheme is letters/digits with no dot before the colon; a bare
  // `host:port` (dot before the colon) is not a scheme and is allowed.
  if (/^[a-z][a-z0-9+-]*:/i.test(trimmed)) return undefined
  return `https://${trimmed}`
}

/**
 * Whether rich-text HTML from the editor carries no visible content — an
 * empty Tiptap document is `<p></p>`. Used to enforce the (previously
 * `required`) description field before submitting.
 */
export function isRichTextEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s+/g, '')
  return text.length === 0
}
