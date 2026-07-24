import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import {
  containerGridClass,
  containerWidthValues,
  responsiveGutterClass,
  responsiveHeaderSpaceClass,
  responsiveTokenStyle,
  spaceValues,
  type ContainerWidth,
} from './layout.types';

import { cn } from '@/lib/utils';

type PageNativeProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'className' | 'style'
>;

export type PageProps = PageNativeProps & {
  width?: ContainerWidth;
  fill?: boolean;
  children: ReactNode;
};

/**
 * Establishes the theme-token scope and shared page width for a route.
 *
 * @default width is `wide` (80rem) with 1rem mobile and 2rem desktop gutters.
 * @invariant Page owns geometry; callers cannot pass className or style.
 * @invariant Page publishes `--header-space` — the single header rhythm every
 * detail surface reads, whether it renders a PageHeader or a full-bleed band.
 */
export function Page({ width = 'wide', fill = false, ...props }: PageProps) {
  const layoutStyle = {
    '--layout-width': containerWidthValues[width],
    ...responsiveTokenStyle(
      'layout-gutter',
      { base: '4', md: '8' },
      spaceValues,
    ),
    ...responsiveTokenStyle(
      'header-space',
      { base: '8', md: '10' },
      spaceValues,
    ),
  };

  return (
    <div
      {...props}
      data-slot="page"
      data-layout="page"
      style={layoutStyle}
      className={cn(
        responsiveGutterClass,
        responsiveHeaderSpaceClass,
        fill && 'md:h-full md:min-h-0',
      )}
    />
  );
}

type PageHeaderNativeProps = Omit<
  ComponentPropsWithoutRef<'header'>,
  'className' | 'style' | 'title' | 'children'
>;

export type PageHeaderProps = PageHeaderNativeProps & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: 'start' | 'center';
  /**
   * Heading scale. `default` is the standard page h1; `display` is the
   * landing-hero scale (matches the `Text` display role) for the marketing
   * top-of-page band. Both keep the single required h1.
   */
  size?: 'default' | 'display';
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
  eyebrow,
  title,
  description,
  actions,
  align = 'start',
  size = 'default',
  children,
  ...props
}: PageHeaderProps) {
  const centered = align === 'center';
  const display = size === 'display';

  return (
    <header
      {...props}
      data-slot="page-header"
      data-layout="page-header"
      data-align={align}
      className={cn(
        // Top spacing only: PageContent's body owns the gap down to the
        // content, so the two never stack into an unintended double gap.
        'flex flex-col gap-4 pt-(--header-space)',
        centered && 'items-center text-center',
      )}
    >
      {eyebrow}
      <div
        data-slot="page-header-heading"
        className={cn(
          'flex w-full flex-col gap-4 md:flex-row md:items-start md:justify-between',
          centered && 'md:flex-col md:items-center',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col gap-2',
            centered && 'items-center',
          )}
        >
          <h1
            className={cn(
              'font-heading font-semibold tracking-tight',
              display ? 'text-4xl md:text-5xl' : 'text-3xl',
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'text-muted-foreground',
                display ? 'text-base md:text-lg' : 'text-base',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div
            data-slot="page-header-actions"
            className="flex shrink-0 flex-wrap gap-2"
          >
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

type PageContentNativeProps = Omit<
  ComponentPropsWithoutRef<'main'>,
  'className' | 'style' | 'children'
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
      asideOrder?: 'before' | 'after';
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
  asideOrder = 'after',
  ...props
}: PageContentProps) {
  const primary = (
    <div
      data-slot="page-primary"
      className={cn(
        'flex min-w-0 flex-col gap-8 lg:row-start-1',
        aside && asideOrder === 'before' ? 'lg:col-start-2' : 'lg:col-start-1',
      )}
    >
      {children}
    </div>
  );

  const complementary = aside ? (
    <aside
      data-slot="page-aside"
      aria-label={asideLabel}
      className={cn(
        'flex flex-col gap-6 lg:sticky lg:top-8 lg:row-start-1 lg:self-start',
        asideOrder === 'before' ? 'lg:col-start-1' : 'lg:col-start-2',
      )}
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
          'grid gap-8 py-8 md:py-10',
          complementary &&
            (asideOrder === 'before'
              ? 'lg:grid-cols-[20rem_minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(0,1fr)_20rem]'),
        )}
      >
        {asideOrder === 'before' ? complementary : null}
        {primary}
        {asideOrder === 'after' ? complementary : null}
      </div>
    </main>
  );
}

type PageSectionNativeProps = Omit<
  ComponentPropsWithoutRef<'section'>,
  | 'className'
  | 'style'
  | 'title'
  | 'children'
  | 'aria-label'
  | 'aria-labelledby'
>;

type TitledPageSectionProps = PageSectionNativeProps & {
  /** Small count/context line above the title (e.g. "9 candidates"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: never;
  children: ReactNode;
};

type AriaLabelledPageSectionProps = PageSectionNativeProps & {
  eyebrow?: never;
  title?: never;
  description?: never;
  actions?: never;
  ariaLabel: string;
  children: ReactNode;
};

export type PageSectionProps =
  | TitledPageSectionProps
  | AriaLabelledPageSectionProps;

/**
 * Groups one named region of a page with an optional description and action.
 *
 * @default Sections use a visible h2 label; ariaLabel is the explicit label-only alternative.
 * @invariant Exactly one labelling mode is required: title or ariaLabel.
 */
export function PageSection(props: PageSectionProps) {
  const generatedId = useId();
  const {
    eyebrow,
    title,
    description,
    actions,
    ariaLabel,
    children,
    ...sectionProps
  } = props as PageSectionNativeProps & {
    eyebrow?: ReactNode;
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
        <div
          data-slot="page-section-header"
          className="flex items-start justify-between gap-4"
        >
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow ? (
              <p
                data-slot="page-section-eyebrow"
                className="text-muted-foreground text-sm font-medium"
              >
                {eyebrow}
              </p>
            ) : null}
            <h2 id={headingId} className="font-heading text-xl font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
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
