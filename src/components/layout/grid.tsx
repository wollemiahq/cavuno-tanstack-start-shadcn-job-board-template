import type { ElementType } from "react";

import { cn } from "@/lib/utils";

import {
  responsiveGapClass,
  responsiveTokenStyle,
  spaceValues,
  type LayoutElement,
  type LayoutProps,
  type Responsive,
  type Space,
} from "./layout.types";

type GridColumns = 1 | 2 | 3 | 4;

type GridOwnProps = {
  columns?: Responsive<GridColumns>;
  gap?: Responsive<Space>;
};

export type GridProps<Element extends LayoutElement = "div"> = LayoutProps<Element, GridOwnProps>;

const columnValues: Record<GridColumns, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};

const columnClass =
  "[grid-template-columns:repeat(var(--layout-columns-base),minmax(0,1fr))] sm:[grid-template-columns:repeat(var(--layout-columns-sm),minmax(0,1fr))] md:[grid-template-columns:repeat(var(--layout-columns-md),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--layout-columns-lg),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--layout-columns-xl),minmax(0,1fr))] 2xl:[grid-template-columns:repeat(var(--layout-columns-2xl),minmax(0,1fr))]";
/**
 * Responsive equal-column grid for one to four columns.
 *
 * @default One column with zero gap.
 * @invariant Column count is constrained to one through four and spacing uses the shared token scale.
 */
export function Grid<Element extends LayoutElement = "div">({
  as,
  columns = 1,
  gap = "0",
  ...props
}: GridProps<Element>) {
  const Component = (as ?? "div") as ElementType;
  const layoutStyle = {
    ...responsiveTokenStyle("layout-columns", columns, columnValues),
    ...responsiveTokenStyle("layout-gap", gap, spaceValues),
  };

  return (
    <Component
      {...props}
      data-slot="grid"
      data-layout="grid"
      style={layoutStyle}
      className={cn("grid", columnClass, responsiveGapClass)}
    />
  );
}
