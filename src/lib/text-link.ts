/**
 * A link inside running text.
 *
 * Deliberately NOT `buttonVariants({ variant: 'link' })`: that variant only
 * sets colour and underline, while the `size` alongside it carries button
 * geometry (`sm` → `h-7 px-3`). On a link sitting in a sentence that padding
 * reads as a stray gap before the label, and the fixed height lifts it off the
 * surrounding baseline. `variant: 'link'` stays correct for standalone action
 * links, where the box does real alignment work.
 *
 * Focus ring matches the plain-anchor treatment already used in `Footer`.
 */
export const textLinkClass =
  'text-primary underline-offset-4 hover:underline focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-2';

/** Same treatment on a `<button type="button">` (resend / change-email). */
export const textActionClass = `${textLinkClass} cursor-pointer disabled:opacity-50`;
