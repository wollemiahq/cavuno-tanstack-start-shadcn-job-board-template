/**
 * Match an accessible name or text that contains a message, for elements
 * whose name joins the message with a count or hint. Escaped so translated
 * punctuation is matched literally.
 */
export function containing(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}
