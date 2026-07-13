import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

import { cx } from '@/utils/cx'

/**
 * The board's typography primitive. Where {@link Prose} owns rendered-HTML
 * strings (job descriptions, blog bodies), `Text` owns authored JSX copy —
 * every hand-written heading and, gradually, body paragraph flows through it.
 *
 * The API is ROLE-NAMED, not size-stepped: you ask for `heading2` or
 * `secondary`, never `text-display-xs`. Each role maps to exactly one Untitled
 * UI token (the mapping is documented in docs/patterns/typography.md), so an
 * off-scale heading is simply unexpressible — there is no `text-2xl` variant.
 * `heading1`-`heading4` are byte-aligned with the vendored `.prose` h1-h4, so a
 * `<Text as="h2" variant="heading2">` and a prose `<h2>` render identically.
 *
 * `as` (the rendered element) is decoupled from `variant` (the visual role):
 * a `display`/`heading*` variant REQUIRES `as` at the type level, forcing the
 * document-outline / a11y decision at every call site. Body-family variants
 * (`body`/`secondary`/`error`) default to `<p>` and alone accept the `size`
 * and `bold` tuning knobs — headings are locked correct-by-construction.
 */

type HeadingVariant = 'display' | 'heading1' | 'heading2' | 'heading3' | 'heading4'
type BodyVariant = 'body' | 'secondary' | 'error'
type Variant = HeadingVariant | BodyVariant

type TextElement =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'div'
  | 'label'
  | 'li'
  | 'dt'
  | 'dd'
  | 'figcaption'

type BodySize = 'xs' | 'sm' | 'base' | 'lg'

/** The `text-*` size + `font-*` weight + default `text-*` color per role. */
const VARIANT_CLASSES: Record<Variant, string> = {
  display: 'text-display-md font-semibold text-primary md:text-display-lg',
  heading1: 'text-display-sm font-semibold text-primary',
  heading2: 'text-display-xs font-semibold text-primary',
  heading3: 'text-xl font-semibold text-primary',
  heading4: 'text-lg font-semibold text-primary',
  body: 'text-md text-primary',
  secondary: 'text-md text-tertiary',
  error: 'text-sm text-error-primary',
}

const BODY_SIZE_CLASSES: Record<BodySize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-md',
  lg: 'text-lg',
}

const BODY_VARIANTS = new Set<Variant>(['body', 'secondary', 'error'])

/**
 * Attributes forwarded to the rendered element. Sourced from `<label>` (a
 * superset carrying `htmlFor` alongside `id`, the `aria-*` set, `children`,
 * event handlers, …) minus the ones this component owns.
 */
type PassthroughProps = Omit<
  ComponentPropsWithoutRef<'label'>,
  'className' | 'color' | 'children'
>

type OwnProps = {
  truncate?: boolean
  className?: string
  children?: ReactNode
}

/** Headings: `as` is required, `size`/`bold` are forbidden. */
type HeadingProps = {
  variant: HeadingVariant
  as: TextElement
  size?: never
  bold?: never
}

/** Body-family: `as` defaults to `<p>`, `size`/`bold` are available. */
type BodyProps = {
  variant?: BodyVariant
  as?: TextElement
  size?: BodySize
  bold?: boolean
}

export type TextProps = (HeadingProps | BodyProps) & OwnProps & PassthroughProps

export function Text({
  variant = 'body',
  as,
  size,
  bold,
  truncate,
  className,
  children,
  ...rest
}: TextProps) {
  const Tag = (as ?? 'p') as ElementType
  const isBody = BODY_VARIANTS.has(variant)

  const classes = cx(
    VARIANT_CLASSES[variant],
    isBody && size ? BODY_SIZE_CLASSES[size] : undefined,
    isBody && bold ? 'font-semibold' : undefined,
    truncate ? 'truncate min-w-0' : undefined,
    className,
  )

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
