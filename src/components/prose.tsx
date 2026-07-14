import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The board's one rich-text surface. Wraps rendered HTML — job descriptions,
 * blog post bodies, company descriptions, legal pages — in the owned shadcn
 * Typeset treatment. `typeset-content` is the one preset; layout owns width.
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
        dangerouslySetInnerHTML={{ __html: html }}
        {...props}
      />
    );
  }

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
