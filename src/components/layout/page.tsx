import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  containerGridClass,
  containerWidthValues,
  responsiveGutterClass,
  responsiveTokenStyle,
  spaceValues,
  type ContainerWidth,
} from "./layout.types";

type PageNativeProps = Omit<ComponentPropsWithoutRef<"div">, "className" | "style">;

export type PageProps = PageNativeProps & {
  width?: ContainerWidth;
  children: ReactNode;
};

/**
 * Establishes the Rhea token scope and shared page width for a route.
 *
 * @default width is `wide` (80rem) with 1rem mobile and 2rem desktop gutters.
 * @invariant Page owns geometry; callers cannot pass className or style.
 */
export function Page({ width = "wide", ...props }: PageProps) {
  const layoutStyle = {
    "--layout-width": containerWidthValues[width],
    ...responsiveTokenStyle("layout-gutter", { base: "4", md: "8" }, spaceValues),
  };

  return (
    <div
      {...props}
      data-slot="page"
      data-layout="page"
      style={layoutStyle}
      className={`rhea-theme ${responsiveGutterClass}`}
    />
  );
}

type PageHeaderNativeProps = Omit<
  ComponentPropsWithoutRef<"header">,
  "className" | "style" | "title" | "children"
>;

export type PageHeaderProps = PageHeaderNativeProps & {
  breadcrumb?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "start" | "center";
  children?: ReactNode;
};

/**
 * Canonical page introduction with one title and optional context, actions,
 * and search/filter controls.
 *
 * @default Start aligned with no optional slots.
 * @invariant Every PageHeader renders exactly one required h1.
 */
export function PageHeader({
  breadcrumb,
  eyebrow,
  title,
  description,
  actions,
  align = "start",
  children,
  ...props
}: PageHeaderProps) {
  const centered = align === "center";

  return (
    <header
      {...props}
      data-slot="page-header"
      data-layout="page-header"
      data-align={align}
      className={cn("flex flex-col gap-4 py-8 md:py-10", centered && "items-center text-center")}
    >
      {breadcrumb}
      {eyebrow}
      <div
        data-slot="page-header-heading"
        className={cn(
          "flex w-full flex-col gap-4 md:flex-row md:items-start md:justify-between",
          centered && "md:flex-col md:items-center",
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-2", centered && "items-center")}>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground text-base">{description}</p> : null}
        </div>
        {actions ? (
          <div data-slot="page-header-actions" className="flex shrink-0 flex-wrap gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

type PageContentNativeProps = Omit<
  ComponentPropsWithoutRef<"main">,
  "className" | "style" | "children"
>;

type PageContentBaseProps = PageContentNativeProps & {
  header?: ReactNode;
  children: ReactNode;
};

export type PageContentProps =
  | (PageContentBaseProps & {
      aside?: never;
      asideLabel?: never;
      asideOrder?: never;
    })
  | (PageContentBaseProps & {
      aside: ReactNode;
      asideLabel: string;
      asideOrder?: "before" | "after";
    });

/**
 * Owns the page's single main landmark, constrained content column, and
 * optional named complementary rail.
 *
 * @default asideOrder is `after`; without an aside the body is one column.
 * @invariant A rendered aside always requires asideLabel and PageContent is the sole main landmark in the Page family.
 */
export function PageContent({
  header,
  children,
  aside,
  asideLabel,
  asideOrder = "after",
  ...props
}: PageContentProps) {
  const primary = (
    <div
      data-slot="page-primary"
      className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1"
    >
      {children}
    </div>
  );

  const complementary = aside ? (
    <aside
      data-slot="page-aside"
      aria-label={asideLabel}
      className="flex flex-col gap-6 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:self-start"
    >
      {aside}
    </aside>
  ) : null;

  return (
    <main
      {...props}
      data-slot="page-content"
      data-layout="page-content"
      className={containerGridClass}
    >
      {header}
      <div
        data-slot="page-body"
        className={cn(
          "grid gap-8 py-8 md:py-10",
          complementary && "lg:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        {asideOrder === "before" ? complementary : null}
        {primary}
        {asideOrder === "after" ? complementary : null}
      </div>
    </main>
  );
}

type PageSectionNativeProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "className" | "style" | "title" | "children" | "aria-label" | "aria-labelledby"
>;

type TitledPageSectionProps = PageSectionNativeProps & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: never;
  children: ReactNode;
};

type AriaLabelledPageSectionProps = PageSectionNativeProps & {
  title?: never;
  description?: never;
  actions?: never;
  ariaLabel: string;
  children: ReactNode;
};

export type PageSectionProps = TitledPageSectionProps | AriaLabelledPageSectionProps;

/**
 * Groups one named region of a page with an optional description and action.
 *
 * @default Sections use a visible h2 label; ariaLabel is the explicit label-only alternative.
 * @invariant Exactly one labelling mode is required: title or ariaLabel.
 */
export function PageSection(props: PageSectionProps) {
  const generatedId = useId();
  const { title, description, actions, ariaLabel, children, ...sectionProps } =
    props as PageSectionNativeProps & {
      title?: ReactNode;
      description?: ReactNode;
      actions?: ReactNode;
      ariaLabel?: string;
      children: ReactNode;
    };

  if (title !== undefined) {
    const headingId = `${generatedId}-heading`;

    return (
      <section
        {...sectionProps}
        data-slot="page-section"
        data-layout="page-section"
        aria-labelledby={headingId}
        className="flex flex-col gap-6"
      >
        <div data-slot="page-section-header" className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={headingId} className="font-heading text-xl font-semibold">
              {title}
            </h2>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
          </div>
          {actions ? (
            <div data-slot="page-section-actions" className="shrink-0">
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section
      {...sectionProps}
      data-slot="page-section"
      data-layout="page-section"
      aria-label={ariaLabel}
      className="flex flex-col gap-6"
    >
      {children}
    </section>
  );
}
