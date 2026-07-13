import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type Responsive<T> =
  | T
  | Readonly<{
      base: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
      "2xl"?: T;
    }>;

export type Space =
  | "0"
  | "1"
  | "1.5"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12"
  | "16"
  | "20";

export type LayoutElement =
  | "div"
  | "section"
  | "article"
  | "header"
  | "footer"
  | "nav"
  | "aside"
  | "ul"
  | "ol"
  | "li";

export type LayoutProps<Element extends LayoutElement, OwnProps extends object> = OwnProps & {
  as?: Element;
  children?: ReactNode;
} & Omit<
    ComponentPropsWithoutRef<Element>,
    keyof OwnProps | "as" | "children" | "className" | "style" | "color"
  >;

const breakpoints = ["base", "sm", "md", "lg", "xl", "2xl"] as const;

export const spaceValues: Record<Space, string> = {
  "0": "0rem",
  "1": "calc(var(--spacing) * 1)",
  "1.5": "calc(var(--spacing) * 1.5)",
  "2": "calc(var(--spacing) * 2)",
  "3": "calc(var(--spacing) * 3)",
  "4": "calc(var(--spacing) * 4)",
  "5": "calc(var(--spacing) * 5)",
  "6": "calc(var(--spacing) * 6)",
  "8": "calc(var(--spacing) * 8)",
  "10": "calc(var(--spacing) * 10)",
  "12": "calc(var(--spacing) * 12)",
  "16": "calc(var(--spacing) * 16)",
  "20": "calc(var(--spacing) * 20)",
};

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
  const responsive = typeof value === "object" ? value : { base: value };
  const style: Record<string, string> = {};
  let current = responsive.base;

  for (const breakpoint of breakpoints) {
    current = responsive[breakpoint] ?? current;
    style[`--${name}-${breakpoint}`] = values[current];
  }

  return style as CSSProperties;
}

export type ContainerWidth = "narrow" | "content" | "wide";

export const containerWidthValues: Record<ContainerWidth, string> = {
  narrow: "42rem",
  content: "48rem",
  wide: "80rem",
};

export const containerGridClass =
  "grid w-full grid-cols-[minmax(var(--layout-gutter),1fr)_[content-start]_minmax(0,var(--layout-width))_[content-end]_minmax(var(--layout-gutter),1fr)] [&>*]:col-[content-start/content-end] [&>[data-layout=bleed]]:col-[1/-1]";

export const responsiveGutterClass =
  "[--layout-gutter:var(--layout-gutter-base)] sm:[--layout-gutter:var(--layout-gutter-sm)] md:[--layout-gutter:var(--layout-gutter-md)] lg:[--layout-gutter:var(--layout-gutter-lg)] xl:[--layout-gutter:var(--layout-gutter-xl)] 2xl:[--layout-gutter:var(--layout-gutter-2xl)]";

export const responsiveGapClass =
  "gap-(--layout-gap-base) sm:gap-(--layout-gap-sm) md:gap-(--layout-gap-md) lg:gap-(--layout-gap-lg) xl:gap-(--layout-gap-xl) 2xl:gap-(--layout-gap-2xl)";
