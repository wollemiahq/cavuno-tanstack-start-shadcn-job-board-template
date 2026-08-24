import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type Responsive<T> =
  | T
  | Readonly<{
      base: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
      '2xl'?: T;
    }>;
type ResponsiveObject<T> = Extract<Responsive<T>, object>;

function isResponsiveObject<Token extends string | number>(
  value: Responsive<Token>,
): value is ResponsiveObject<Token> {
  return Object(value) === value;
}

export type Space =
  | '0'
  | '1'
  | '1.5'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '8'
  | '10'
  | '12'
  | '16'
  | '20';

export type LayoutElement =
  | 'div'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'nav'
  | 'aside'
  | 'ul'
  | 'ol'
  | 'li';

export type LayoutProps<
  Element extends LayoutElement,
  OwnProps extends object,
> = OwnProps & {
  as?: Element;
  children?: ReactNode;
} & Omit<
    ComponentPropsWithoutRef<Element>,
    keyof OwnProps | 'as' | 'children' | 'className' | 'style' | 'color'
  >;

const breakpoints = ['base', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

export const spaceValues = {
  '0': '0rem',
  '1': 'calc(var(--spacing) * 1)',
  '1.5': 'calc(var(--spacing) * 1.5)',
  '2': 'calc(var(--spacing) * 2)',
  '3': 'calc(var(--spacing) * 3)',
  '4': 'calc(var(--spacing) * 4)',
  '5': 'calc(var(--spacing) * 5)',
  '6': 'calc(var(--spacing) * 6)',
  '8': 'calc(var(--spacing) * 8)',
  '10': 'calc(var(--spacing) * 10)',
  '12': 'calc(var(--spacing) * 12)',
  '16': 'calc(var(--spacing) * 16)',
  '20': 'calc(var(--spacing) * 20)',
} satisfies Record<Space, string>;

/**
 * Converts a constrained mobile-first value to private CSS variables. Missing
 * breakpoints inherit the nearest smaller token before rendering, so static
 * responsive utilities only need to read one variable per breakpoint.
 */
export function responsiveTokenStyle<Token extends string | number>(
  name: string,
  value: Responsive<Token>,
  values: Record<Token, string>,
) {
  const responsive: ResponsiveObject<Token> = isResponsiveObject(value)
    ? value
    : { base: value };
  const style: Record<string, string> = {};
  let current = responsive.base;

  for (const breakpoint of breakpoints) {
    current = responsive[breakpoint] ?? current;
    style[`--${name}-${breakpoint}`] = values[current];
  }

  // SAFETY: The generated keys are private CSS custom properties consumed by
  // layout utility classes; values are resolved from the supplied token map.
  return style as CSSProperties;
}

export type ContainerWidth = 'narrow' | 'content' | 'wide';

export const containerWidthValues = {
  narrow: '42rem',
  content: '48rem',
  wide: '80rem',
} satisfies Record<ContainerWidth, string>;

export const containerGridClass =
  'grid w-full grid-cols-[minmax(var(--layout-gutter),1fr)_[content-start]_minmax(0,var(--layout-width))_[content-end]_minmax(var(--layout-gutter),1fr)] [&>*]:col-[content-start/content-end] [&>[data-layout=bleed]]:col-[1/-1]';

export const responsiveGutterClass =
  '[--layout-gutter:var(--layout-gutter-base)] sm:[--layout-gutter:var(--layout-gutter-sm)] md:[--layout-gutter:var(--layout-gutter-md)] lg:[--layout-gutter:var(--layout-gutter-lg)] xl:[--layout-gutter:var(--layout-gutter-xl)] 2xl:[--layout-gutter:var(--layout-gutter-2xl)]';

/**
 * The one header rhythm every detail surface reads. Both header idioms — the
 * constrained `PageHeader` and the full-bleed grey bands — consume this, so the
 * spacing above a page's title can only be changed in one place.
 */
export const responsiveHeaderSpaceClass =
  '[--header-space:var(--header-space-base)] sm:[--header-space:var(--header-space-sm)] md:[--header-space:var(--header-space-md)] lg:[--header-space:var(--header-space-lg)] xl:[--header-space:var(--header-space-xl)] 2xl:[--header-space:var(--header-space-2xl)]';

export const responsiveGapClass =
  'gap-(--layout-gap-base) sm:gap-(--layout-gap-sm) md:gap-(--layout-gap-md) lg:gap-(--layout-gap-lg) xl:gap-(--layout-gap-xl) 2xl:gap-(--layout-gap-2xl)';
