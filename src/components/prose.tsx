import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The board's one rich-text surface. Wraps rendered HTML — job descriptions,
 * blog post bodies, company descriptions, legal pages — in the owned shadcn
 * Typeset treatment. `typeset-content` is the one preset; layout owns width.
 *
 * CONTENT DIRECTION. The chrome's direction comes from the UI locale
 * (`<html dir>`, src/lib/locale-direction.ts). The content's does not: a
 * board is a single-language product but a single POSTING can be written in
 * anything, so direction is resolved from the text itself with `dir="auto"`
 * — the browser reads the first strong directional character. That is what
 * stops an LTR description rendering with displaced punctuation under RTL
 * chrome (`".strategy, the team"`), without pinning content to the chrome's
 * direction or to the board's language, either of which is wrong for one of
 * the four locale/content combinations.
 *
 * Two honest limits, both inherent to the platform mechanism:
 *   • First-strong is a HEURISTIC. Content opening with a number, an emoji,
 *     punctuation, or a Latin brand name ("Acme Corp — وصف الوظيفة…")
 *     resolves LTR even when the body is RTL. A per-item content-language
 *     field on the API would be the principled fix; the API has no such
 *     field today.
 *   • This element is one direction for the whole HTML blob. AGENTS.md rule
 *     4 forbids interpolating into pre-sanitized API HTML, so per-paragraph
 *     `dir` is not available to us; genuinely mixed-direction bodies take
 *     the direction of their first strong character throughout.
 * `dir` stays overridable — the prop spread below wins over the default.
 *
 * Pass `html` to render pre-sanitized Board API HTML as-is (the API sanitizes
 * server-side — never interpolate other strings into it), or `children` to
 * compose the prose column yourself (e.g. a legal page with its own heading
 * and a `not-typeset` facts card).
 */
type ProseProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'dangerouslySetInnerHTML'
> & {
  html?: string;
  children?: ReactNode;
  as?: ElementType;
};

export function Prose({
  html,
  children,
  as: Tag = 'div',
  className,
  ...props
}: ProseProps) {
  const classes = cn('typeset typeset-content', className);

  if (html !== undefined) {
    return (
      <Tag
        className={classes}
        dir="auto"
        dangerouslySetInnerHTML={{ __html: html }}
        {...props}
      />
    );
  }

  return (
    <Tag className={classes} dir="auto" {...props}>
      {children}
    </Tag>
  );
}
