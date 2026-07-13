import type { ElementType, ReactNode } from 'react'

import { cx } from '@/utils/cx'

/**
 * The board's one rich-text surface. Wraps rendered HTML — job descriptions,
 * blog post bodies, company descriptions, legal pages — in the Untitled UI
 * prose treatment (the vendored `.prose` type scale on UUI tokens) plus the
 * repo's `prose-uui` overlay (brand-colored links). One class set, one place.
 *
 * Pass `html` to render pre-sanitized Board API HTML as-is (the API sanitizes
 * server-side — never interpolate other strings into it), or `children` to
 * compose the prose column yourself (e.g. a legal page with its own heading
 * and a `not-prose` facts card).
 */
export function Prose({
  html,
  children,
  as: Tag = 'div',
  className,
}: {
  html?: string
  children?: ReactNode
  as?: ElementType
  className?: string
}) {
  const classes = cx('prose prose-uui max-w-none', className)

  if (html !== undefined) {
    return <Tag className={classes} dangerouslySetInnerHTML={{ __html: html }} />
  }

  return <Tag className={classes}>{children}</Tag>
}
