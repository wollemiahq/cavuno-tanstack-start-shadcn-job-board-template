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

type StackDirection = "row" | "column";
type StackAlignment = "start" | "center" | "end" | "stretch" | "baseline";
type StackJustification = "start" | "center" | "end" | "between" | "around" | "evenly";

type StackOwnProps = {
  direction?: Responsive<StackDirection>;
  gap?: Responsive<Space>;
  align?: Responsive<StackAlignment>;
  justify?: Responsive<StackJustification>;
  wrap?: "nowrap" | "wrap";
};

export type StackProps<Element extends LayoutElement = "div"> = LayoutProps<Element, StackOwnProps>;

const directionValues: Record<StackDirection, string> = {
  row: "row",
  column: "column",
};

const alignmentValues: Record<StackAlignment, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const justificationValues: Record<StackJustification, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

const directionClass =
  "[flex-direction:var(--layout-direction-base)] sm:[flex-direction:var(--layout-direction-sm)] md:[flex-direction:var(--layout-direction-md)] lg:[flex-direction:var(--layout-direction-lg)] xl:[flex-direction:var(--layout-direction-xl)] 2xl:[flex-direction:var(--layout-direction-2xl)]";
const alignmentClass =
  "[align-items:var(--layout-align-base)] sm:[align-items:var(--layout-align-sm)] md:[align-items:var(--layout-align-md)] lg:[align-items:var(--layout-align-lg)] xl:[align-items:var(--layout-align-xl)] 2xl:[align-items:var(--layout-align-2xl)]";
const justificationClass =
  "[justify-content:var(--layout-justify-base)] sm:[justify-content:var(--layout-justify-sm)] md:[justify-content:var(--layout-justify-md)] lg:[justify-content:var(--layout-justify-lg)] xl:[justify-content:var(--layout-justify-xl)] 2xl:[justify-content:var(--layout-justify-2xl)]";

const wrapClasses = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
} as const;

/**
 * Mobile-first flex layout for vertical or horizontal groups.
 *
 * @default Column, zero gap, stretch alignment, start justification, and no wrapping.
 * @invariant Responsive values always declare a base value and use the shared token scale.
 */
export function Stack<Element extends LayoutElement = "div">({
  as,
  direction = "column",
  gap = "0",
  align = "stretch",
  justify = "start",
  wrap = "nowrap",
  ...props
}: StackProps<Element>) {
  const Component = (as ?? "div") as ElementType;
  const layoutStyle = {
    ...responsiveTokenStyle("layout-direction", direction, directionValues),
    ...responsiveTokenStyle("layout-gap", gap, spaceValues),
    ...responsiveTokenStyle("layout-align", align, alignmentValues),
    ...responsiveTokenStyle("layout-justify", justify, justificationValues),
  };

  return (
    <Component
      {...props}
      data-slot="stack"
      data-layout="stack"
      style={layoutStyle}
      className={cn(
        "flex",
        directionClass,
        responsiveGapClass,
        alignmentClass,
        justificationClass,
        wrapClasses[wrap],
      )}
    />
  );
}
