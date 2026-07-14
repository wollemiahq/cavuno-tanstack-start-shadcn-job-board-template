import type { ElementType } from 'react';

import {
  responsiveTokenStyle,
  spaceValues,
  type LayoutElement,
  type LayoutProps,
  type Responsive,
  type Space,
} from './layout.types';

import { cn } from '@/lib/utils';

type BoxBackground =
  | 'transparent'
  | 'background'
  | 'card'
  | 'muted'
  | 'accent'
  | 'primary'
  | 'secondary';

type BoxBorder =
  | 'none'
  | 'all'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'x'
  | 'y';

type BoxRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

type BoxOwnProps = {
  padding?: Responsive<Space>;
  paddingX?: Responsive<Space>;
  paddingY?: Responsive<Space>;
  background?: BoxBackground;
  border?: BoxBorder;
  radius?: BoxRadius;
};

export type BoxProps<Element extends LayoutElement = 'div'> = LayoutProps<
  Element,
  BoxOwnProps
>;

const backgroundClasses: Record<BoxBackground, string> = {
  transparent: '',
  background: 'bg-background text-foreground',
  card: 'bg-card text-card-foreground',
  muted: 'bg-muted text-foreground',
  accent: 'bg-accent text-accent-foreground',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
};

const borderClasses: Record<BoxBorder, string> = {
  none: '',
  all: 'border',
  top: 'border-t',
  right: 'border-r',
  bottom: 'border-b',
  left: 'border-l',
  x: 'border-x',
  y: 'border-y',
};

const radiusClasses: Record<BoxRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const paddingClass =
  'p-(--layout-padding-base) sm:p-(--layout-padding-sm) md:p-(--layout-padding-md) lg:p-(--layout-padding-lg) xl:p-(--layout-padding-xl) 2xl:p-(--layout-padding-2xl)';
const paddingXClass =
  'px-(--layout-padding-x-base) sm:px-(--layout-padding-x-sm) md:px-(--layout-padding-x-md) lg:px-(--layout-padding-x-lg) xl:px-(--layout-padding-x-xl) 2xl:px-(--layout-padding-x-2xl)';
const paddingYClass =
  'py-(--layout-padding-y-base) sm:py-(--layout-padding-y-sm) md:py-(--layout-padding-y-md) lg:py-(--layout-padding-y-lg) xl:py-(--layout-padding-y-xl) 2xl:py-(--layout-padding-y-2xl)';

/**
 * Token-backed surface for padding, background, border, and radius.
 *
 * @default Transparent div with zero padding, no border, and no radius.
 * @invariant Visual geometry is expressed only through the constrained props; className and style are not public.
 */
export function Box<Element extends LayoutElement = 'div'>({
  as,
  padding = '0',
  paddingX,
  paddingY,
  background = 'transparent',
  border = 'none',
  radius = 'none',
  ...props
}: BoxProps<Element>) {
  const Component = (as ?? 'div') as ElementType;
  const layoutStyle = {
    ...responsiveTokenStyle('layout-padding', padding, spaceValues),
    ...(paddingX
      ? responsiveTokenStyle('layout-padding-x', paddingX, spaceValues)
      : {}),
    ...(paddingY
      ? responsiveTokenStyle('layout-padding-y', paddingY, spaceValues)
      : {}),
  };

  return (
    <Component
      {...props}
      data-slot="box"
      data-layout="box"
      style={layoutStyle}
      className={cn(
        paddingClass,
        paddingX && paddingXClass,
        paddingY && paddingYClass,
        backgroundClasses[background],
        borderClasses[border],
        radiusClasses[radius],
      )}
    />
  );
}
