import type { ElementType } from "react";

import { cn } from "@/lib/utils";

import {
  containerGridClass,
  containerWidthValues,
  responsiveGutterClass,
  responsiveTokenStyle,
  spaceValues,
  type ContainerWidth,
  type LayoutElement,
  type LayoutProps,
  type Responsive,
  type Space,
} from "./layout.types";

type ContainerOwnProps = {
  width?: ContainerWidth;
  gutter?: Responsive<Space>;
};

export type ContainerProps<Element extends LayoutElement = "div"> = LayoutProps<
  Element,
  ContainerOwnProps
>;

/**
 * Centers content on a named width while preserving full-width Bleed children.
 *
 * @default Wide (80rem) content with 1rem mobile and 2rem desktop gutters.
 * @invariant Bleed works only as a direct rendered child of this grid.
 */
export function Container<Element extends LayoutElement = "div">({
  as,
  width = "wide",
  gutter = { base: "4", md: "8" },
  ...props
}: ContainerProps<Element>) {
  const Component = (as ?? "div") as ElementType;
  const layoutStyle = {
    "--layout-width": containerWidthValues[width],
    ...responsiveTokenStyle("layout-gutter", gutter, spaceValues),
  };

  return (
    <Component
      {...props}
      data-slot="container"
      data-layout="container"
      style={layoutStyle}
      className={cn(containerGridClass, responsiveGutterClass)}
    />
  );
}
