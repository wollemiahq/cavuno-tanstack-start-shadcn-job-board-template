import type { ElementType } from 'react';

import type { LayoutElement, LayoutProps } from './layout.types';

export type BleedProps<Element extends LayoutElement = 'div'> = LayoutProps<
  Element,
  Record<never, never>
>;

/**
 * Escapes the content columns of a Container or PageContent. Bleed must be a
 * direct rendered child of that owning grid; it deliberately has no sizing
 * or axis variants because full-width horizontal bands are the proven case.
 *
 * @default Renders a div without adding visual styling.
 * @invariant Must be a direct rendered child of Container or PageContent.
 */
export function Bleed<Element extends LayoutElement = 'div'>({
  as,
  ...props
}: BleedProps<Element>) {
  // SAFETY: `as` is constrained to LayoutElement; React accepts that finite
  // intrinsic element set as an ElementType for polymorphic rendering.
  const Component = (as ?? 'div') as ElementType;

  return <Component {...props} data-slot="bleed" data-layout="bleed" />;
}
