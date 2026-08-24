import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The board's typography primitive. Where {@link Prose} owns rendered-HTML
 * strings (job descriptions, blog bodies), `Text` owns authored JSX copy —
 * every hand-written heading and, gradually, body paragraph flows through it.
 *
 * The API is ROLE-NAMED, not size-stepped: you ask for `heading2` or
 * `secondary`, never a raw size token. Each role maps to the owned shadcn
 * typeset scale, so heading hierarchy remains explicit at every call site.
 *
 * `as` (the rendered element) is decoupled from `variant` (the visual role):
 * a `display`/`heading*` variant REQUIRES `as` at the type level, forcing the
 * document-outline / a11y decision at every call site. Body-family variants
 * (`body`/`secondary`/`error`) default to `<p>` and alone accept the `size`
 * and `bold` tuning knobs — headings are locked correct-by-construction.
 */

type HeadingVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4';
type BodyVariant = 'body' | 'secondary' | 'error';
type Variant = HeadingVariant | BodyVariant;

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
  | 'figcaption';

type BodySize = 'xs' | 'sm' | 'base' | 'lg';

/** The `text-*` size + `font-*` weight + default `text-*` color per role. */
const VARIANT_CLASSES = {
  display: 'text-4xl font-semibold text-foreground md:text-5xl',
  heading1: 'text-3xl font-semibold text-foreground',
  heading2: 'text-2xl font-semibold text-foreground',
  heading3: 'text-xl font-semibold text-foreground',
  heading4: 'text-lg font-semibold text-foreground',
  body: 'text-base text-foreground',
  secondary: 'text-base text-muted-foreground',
  error: 'text-sm text-destructive',
} satisfies Record<Variant, string>;

const BODY_SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
} satisfies Record<BodySize, string>;

const BODY_VARIANTS = new Set<Variant>(['body', 'secondary', 'error']);

/**
 * Attributes forwarded to the rendered element. Sourced from `<label>` (a
 * superset carrying `htmlFor` alongside `id`, the `aria-*` set, `children`,
 * event handlers, …) minus the ones this component owns.
 */
type PassthroughProps = Omit<
  ComponentPropsWithoutRef<'label'>,
  'className' | 'color' | 'children'
>;

type OwnProps = {
  truncate?: boolean;
  className?: string;
  children?: ReactNode;
};

/** Headings: `as` is required, `size`/`bold` are forbidden. */
type HeadingProps = {
  variant: HeadingVariant;
  as: TextElement;
  size?: never;
  bold?: never;
};

/** Body-family: `as` defaults to `<p>`, `size`/`bold` are available. */
type BodyProps = {
  variant?: BodyVariant;
  as?: TextElement;
  size?: BodySize;
  bold?: boolean;
};

export type TextProps = (HeadingProps | BodyProps) &
  OwnProps &
  PassthroughProps;

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
  // SAFETY: `as` is constrained to TextElement; React accepts that finite
  // intrinsic element set as an ElementType for this polymorphic primitive.
  const Tag = (as ?? 'p') as ElementType;
  const isBody = BODY_VARIANTS.has(variant);

  const classes = cn(
    VARIANT_CLASSES[variant],
    isBody && size ? BODY_SIZE_CLASSES[size] : undefined,
    isBody && bold ? 'font-semibold' : undefined,
    truncate ? 'min-w-0 truncate' : undefined,
    className,
  );

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
