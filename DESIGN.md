---
version: alpha
name: Cavuno board frontend
description: Board frontend chassis — generated design-system carrier; sources are src/theme.css, src/components source, and the registry snapshot.
colors:
  background: 'oklch(1 0 0)'
  foreground: 'oklch(0.145 0 0)'
  card: 'oklch(1 0 0)'
  card-foreground: 'oklch(0.145 0 0)'
  popover: 'oklch(1 0 0)'
  popover-foreground: 'oklch(0.145 0 0)'
  primary: 'oklch(0.205 0 0)'
  primary-foreground: 'oklch(0.985 0 0)'
  secondary: 'oklch(0.97 0 0)'
  secondary-foreground: 'oklch(0.205 0 0)'
  muted: 'oklch(0.97 0 0)'
  muted-foreground: 'oklch(0.556 0 0)'
  accent: 'oklch(0.97 0 0)'
  accent-foreground: 'oklch(0.205 0 0)'
  destructive: 'oklch(0.577 0.245 27.325)'
  destructive-foreground: 'oklch(0.985 0 0)'
  border: 'oklch(0.922 0 0)'
  input: 'oklch(0.922 0 0)'
  ring: 'oklch(0.708 0 0)'
  chart-1: 'oklch(0.87 0 0)'
  chart-2: 'oklch(0.556 0 0)'
  chart-3: 'oklch(0.439 0 0)'
  chart-4: 'oklch(0.371 0 0)'
  chart-5: 'oklch(0.269 0 0)'
  sidebar: 'oklch(0.985 0 0)'
  sidebar-foreground: 'oklch(0.145 0 0)'
  sidebar-primary: 'oklch(0.205 0 0)'
  sidebar-primary-foreground: 'oklch(0.985 0 0)'
  sidebar-accent: 'oklch(0.97 0 0)'
  sidebar-accent-foreground: 'oklch(0.205 0 0)'
  sidebar-border: 'oklch(0.922 0 0)'
  sidebar-ring: 'oklch(0.708 0 0)'
  background-dark: 'oklch(0.145 0 0)'
  foreground-dark: 'oklch(0.985 0 0)'
  card-dark: 'oklch(0.205 0 0)'
  card-foreground-dark: 'oklch(0.985 0 0)'
  popover-dark: 'oklch(0.205 0 0)'
  popover-foreground-dark: 'oklch(0.985 0 0)'
  primary-dark: 'oklch(0.922 0 0)'
  primary-foreground-dark: 'oklch(0.205 0 0)'
  secondary-dark: 'oklch(0.269 0 0)'
  secondary-foreground-dark: 'oklch(0.985 0 0)'
  muted-dark: 'oklch(0.269 0 0)'
  muted-foreground-dark: 'oklch(0.708 0 0)'
  accent-dark: 'oklch(0.269 0 0)'
  accent-foreground-dark: 'oklch(0.985 0 0)'
  destructive-dark: 'oklch(0.704 0.191 22.216)'
  destructive-foreground-dark: 'oklch(0.985 0 0)'
  border-dark: 'oklch(1 0 0 / 10%)'
  input-dark: 'oklch(1 0 0 / 15%)'
  ring-dark: 'oklch(0.556 0 0)'
  chart-1-dark: 'oklch(0.87 0 0)'
  chart-2-dark: 'oklch(0.556 0 0)'
  chart-3-dark: 'oklch(0.439 0 0)'
  chart-4-dark: 'oklch(0.371 0 0)'
  chart-5-dark: 'oklch(0.269 0 0)'
  sidebar-dark: 'oklch(0.205 0 0)'
  sidebar-foreground-dark: 'oklch(0.985 0 0)'
  sidebar-primary-dark: 'oklch(0.488 0.243 264.376)'
  sidebar-primary-foreground-dark: 'oklch(0.985 0 0)'
  sidebar-accent-dark: 'oklch(0.269 0 0)'
  sidebar-accent-foreground-dark: 'oklch(0.985 0 0)'
  sidebar-border-dark: 'oklch(1 0 0 / 10%)'
  sidebar-ring-dark: 'oklch(0.556 0 0)'
typography:
  sans:
    fontFamily: 'Geist Variable', sans-serif
  heading:
    fontFamily: var(--font-sans)
---

<!-- GENERATED FILE — do not edit. `pnpm run gen:design` regenerates
     from src/theme.css + component source + design/registry-items.json;
     CI diffs the output and rejects hand-edits (ADR-0066 D15). -->

## Overview

A job-board frontend for one Cavuno board, grounded in the Board API
via its publishable key. Theme source of truth is `src/theme.css`
(mode: system); this file carries the
derived tokens and the component inventory for agents.

Workspace design intent (operator direction picks, brand decisions,
confirmed assumptions) is reflected below by the builder as normal
commits — structural constraints stay enforced in code.

## Colors

Light (`:root`) and dark (`.dark`) values from `src/theme.css`.
Always style through the CSS custom properties
(`var(--primary)`, Tailwind theme utilities) — never hardcode hex
values in components.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--destructive-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `--chart-1` | `oklch(0.87 0 0)` | `oklch(0.87 0 0)` |
| `--chart-2` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` |
| `--chart-3` | `oklch(0.439 0 0)` | `oklch(0.439 0 0)` |
| `--chart-4` | `oklch(0.371 0 0)` | `oklch(0.371 0 0)` |
| `--chart-5` | `oklch(0.269 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |

## Typography

- Sans: `'Geist Variable', sans-serif`
- Headings: `var(--font-sans)`

## Layout

Radius scale rides `--radius` in `src/theme.css` (cards use
`--radius-xl`, controls `--radius-md`). Spacing is Tailwind default
scale; no custom spacing tokens.

Interactive links and cards share ONE focus ring:
`focus-visible:ring-ring/50 focus-visible:ring-2` (use `focus-within` in
its place only for the stretched-overlay-link card, matching
`SearchResultCard`). Form-control primitives keep the shadcn default
ring; do not invent a third focus idiom.

Stacking order is the named z-index scale in `src/styles.css`
(`--z-card-overlay` 1 → `--z-floating-stack` 40 → `--z-overlay` 50 →
`--z-preview-toolbar` 60 → `--z-skip-link` 100). Reach for a token
(`z-(--z-…)`, `after:z-(--z-card-overlay)`) instead of a magic `z-[…]`
value so the layering order stays legible in one place.

## Layout primitives

Token-backed geometry with constrained responsive APIs. These components deliberately omit `className` and `style`.

### Bleed — `src/components/layout/bleed.tsx`

Escapes the content columns of a Container or PageContent. Bleed must be a
direct rendered child of that owning grid; it deliberately has no sizing
or axis variants because full-width horizontal bands are the proven case.

Props:

- `as?: Element | undefined`
- `children?: ReactNode`

Defaults:

- Renders a div without adding visual styling.

Invariants:

- Must be a direct rendered child of Container or PageContent.

### Box — `src/components/layout/box.tsx`

Token-backed surface for padding, background, border, and radius.

Props:

- `as?: Element | undefined`
- `background?: BoxBackground | undefined`
- `border?: BoxBorder | undefined`
- `children?: ReactNode`
- `padding?: Responsive<Space> | undefined`
- `paddingX?: Responsive<Space> | undefined`
- `paddingY?: Responsive<Space> | undefined`
- `radius?: BoxRadius | undefined`

Defaults:

- Transparent div with zero padding, no border, and no radius.

Invariants:

- Visual geometry is expressed only through the constrained props; className and style are not public.

### Container — `src/components/layout/container.tsx`

Centers content on a named width while preserving full-width Bleed children.

Props:

- `as?: Element | undefined`
- `children?: ReactNode`
- `gutter?: Responsive<Space> | undefined`
- `width?: ContainerWidth | undefined`

Defaults:

- Wide (80rem) content with 1rem mobile and 2rem desktop gutters.

Invariants:

- Bleed works only as a direct rendered child of this grid.

### Grid — `src/components/layout/grid.tsx`

Responsive equal-column grid for one to four columns.

Props:

- `as?: Element | undefined`
- `children?: ReactNode`
- `columns?: Responsive<GridColumns> | undefined`
- `gap?: Responsive<Space> | undefined`

Defaults:

- One column with zero gap.

Invariants:

- Column count is constrained to one through four and spacing uses the shared token scale.

## Components

Generated inventory of reusable components under `src/components`. This inventory includes explicitly labelled migration-only compatibility components; never select those for new page-level composition.

### AccountShell — `src/components/account-shell.tsx`

Props:

- `active: string`
- `children: ReactNode`
- `identity: ShellIdentity`
- `nav: ShellNavItem[]`
- `rail?: ReactNode`

### EmployerIdentityAvatar — `src/components/account-shell.tsx`

Props:

- `logoUrl?: string | null | undefined`
- `name: string`
- `size?: "default" | "sm" | "lg" | undefined`

### AlertManager — `src/components/alert-manager.tsx`

Props:

- `alerts: { id: string; object: "alert"; label: string | null; frequency: "weekly"; isActive: boolean; filters: { jobFunctions:…`
- `places: AlertPlaceOption[]`

### NotFound — `src/components/app-not-found.tsx`

### AppRouteError — `src/components/app-route-error.tsx`

The public-facing route error state — the root route's backstop for a
loader rejection anywhere in the tree (a Board API 500/timeout, a failed
`serverFnFetcher`). Without it TanStack has no error boundary above the
six candidate routes, so a rejecting public loader left the page blank.

Two constraints shape this surface:
 - It stands in for `RootLayout`, so it renders its own `<main>` and its
   own `Page` (which owns the design-token scope) — the header/footer chrome
   is NOT mounted around it.
 - It reads NO loader data. The root loader is one of the things that can
   fail, so board context may never have resolved; copy comes from the
   Paraglide seam and the recovery link is a static typed route.

Props:

- `description: string`
- `homeLabel: string`
- `reset: () => void`
- `retryLabel: string`
- `title: string`

### AppRouteErrorPage — `src/components/app-route-error.tsx`

### AppRouterProvider — `src/components/app-router-provider.tsx`

Keeps React Aria links on the TanStack Router and locale-aware URL seam.

Props:

- `children: ReactNode`

### AuthCard — `src/components/auth-form.tsx`

Props:

- `children: ReactNode`
- `supportingText?: ReactNode`
- `title: string`

### AuthDivider — `src/components/auth-form.tsx`

Props:

- `label: string`

### Field — `src/components/auth-form.tsx`

Props:

- `autoComplete?: string | undefined`
- `label: string`
- `labelAction?: ReactNode`
- `minLength?: number | undefined`
- `name: string`
- `type?: string | undefined`

### FormError — `src/components/auth-form.tsx`

Props:

- `message: string | null`

### AvatarUpload — `src/components/avatar-upload.tsx`

Avatar uploader — mirrors the hosted `profile-avatar-uploader`: pick a
file, POST it as multipart to the route-mediated upload, then refresh.
The SDK call is `board.me.profile.uploadAvatar(file)`.

Props:

- `avatarUrl: string | null`
- `displayName: string | null`

### AlertSignupForm — `src/components/board/alert-signup-form.tsx`

Props:

- `context?: { source?: string | undefined; jobId?: string | undefined; jobSlug?: string | undefined; } | undefined`
- `description?: string | undefined`
- `filters?: JobAlertFiltersInput | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onSubscribe: (input: JobAlertSubscribeInput) => Promise<{ status: "submitted"; }>`
- `surface?: "default" | "card" | undefined`
- `title?: string | undefined`

### ApplyButton — `src/components/board/apply-button.tsx`

Props:

- `alreadyApplied?: boolean | undefined`
- `applicationsHref?: string | undefined`
- `applicationUrl: string | null`
- `companySlug?: string | undefined`
- `jobId: string`
- `jobSlug: string | null`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `nativeApplications?: boolean | undefined`
- `onApply: (jobSlug: string) => Promise<void>`
- `returnTo: string`
- `viewer: { emailVerified: boolean; } | null`

### BlogArchivePage — `src/components/board/blog-archive-page.tsx`

Shared Page-family presentation for the blog, tag, and author archives.

Props:

- `avatar?: ReactNode`
- `breadcrumb?: BreadcrumbData | undefined`
- `description?: string | null | undefined`
- `empty: BlogArchiveEmptyState`
- `filters?: ReactNode`
- `pagination?: ReactNode`
- `posts: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`
- `search?: ReactNode`
- `title: string`

### BlogArticleContent — `src/components/board/blog-article-content.tsx`

Complete reusable article presentation for the canonical post route.

Props:

- `adjacent?: { object: "blog_adjacent_posts"; previous: { id: string; object: "public_blog_post"; title: string; slug: string; fea…`
- `breadcrumb: BreadcrumbData`
- `language: string`
- `missingBody: BlogArticleMissingBodyState`
- `permalink: string`
- `post: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`
- `related?: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`

### BlogTagChips — `src/components/board/blog-tag-chips.tsx`

The blog's topic row: an "All" chip back to the index plus one anchor per
tag. Shared by the index and every tag archive so each tag page interlinks
every other tag, with the current tag in the index's active treatment.

Props:

- `activeTagSlug?: string | null | undefined`
- `allActive?: boolean | undefined`
- `tags: ({ id: string; name: string; slug: string; description: string | null; } & { object: "public_blog_tag"; })[]`

### Breadcrumb — `src/components/board/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

Props:

- `ariaLabel?: string | undefined`
- `items: { name: string; href?: string | undefined; }[]`

### ShellBreadcrumb — `src/components/board/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

Props:

- `ariaLabel: string`
- `items: { name: string; href?: string | undefined; }[]`

### CandidateAccountShell — `src/components/board/candidate-account-shell.tsx`

Candidate account content wrapper. Account navigation now lives in the
signed-in header's avatar menu (CAV-510), so this shell owns only the page's
single main landmark and content column. `title`/`description`/`actions`
render the canonical PageHeader; pages with a complementary rail (e.g. the
profile-completeness card on /account) pass `aside` + `asideLabel` and get
the wide two-column PageContent geometry.

Props:

- `actions?: ReactNode`
- `aside?: ReactNode`
- `asideLabel?: string | undefined`
- `children: ReactNode`
- `description?: ReactNode`
- `title?: ReactNode`

### CompanyAvatar — `src/components/board/company-avatar.tsx`

Company mark — the one shared way a company logo renders across every
board surface. It is a thin, override-free wrapper over the owned Avatar
primitive: the shape, ring, and image fit all come from the primitive, so
a company reads identically everywhere (and matches people avatars, which
use the same primitive directly). The only thing this adds over a raw
`<Avatar>` is the two-letter initials fallback when no logo exists.

`size` is the Avatar primitive's own scale — `sm`/`default`/`lg`/`xl`
(size-6/8/10/12). `className` is a layout-only passthrough (margins,
responsive display); it must never carry shape/size/fit overrides.

Props:

- `className?: string | undefined`
- `logoUrl?: string | null | undefined`
- `name: string`
- `size?: "default" | "sm" | "lg" | "xl" | undefined`

### CompanyCard — `src/components/board/company-card.tsx`

Props:

- `companySlug: string`
- `description: string | null`
- `jobCountLabel: string`
- `logoUrl: string | null`
- `name: string`
- `publishedJobCount: number`

### CompanySearchDetailState — `src/components/board/company-search-detail-state.tsx`

Props:

- `detail?: ReactNode`
- `errorTitle: string`
- `loadingLabel: string`
- `onRetry: () => void`
- `retryLabel: string`
- `status: "idle" | "loading" | "ready" | "error"`

### CompanySearchPage — `src/components/board/company-search-page.tsx`

Props:

- `breadcrumb?: BreadcrumbData | undefined`
- `companies: CompanyCardVM[]`
- `count: number`
- `detail: ReactNode`
- `endAd?: AdPlacement | undefined`
- `hasPreviousResults?: boolean | undefined`
- `heading?: string | undefined`
- `markets: { slug: string; name: string; }[]`
- `nextCursor?: string | null | undefined`
- `onNextResults?: (() => void) | undefined`
- `onPageChange: (page: number) => void`
- `onPreviousResults?: (() => void) | undefined`
- `onSelectedCompanyPush: (companySlug: string) => void`
- `onSelectedCompanyReplace: (companySlug: string) => void`
- `page: number`
- `pageSize: number`
- `query?: string | undefined`
- `selectedCompany?: string | undefined`
- `startAd?: AdPlacement | undefined`

### CompanySearchResultDetail — `src/components/board/company-search-result-detail.tsx`

Props:

- `hasSalaries?: boolean | undefined`
- `interactive?: boolean | undefined`
- `jobPreviews?: JobCardVM[] | undefined`
- `salaryOverall?: OverallSalaryVM | null | undefined`
- `vm: CompanyDetailVM`

### CompanySearchResult — `src/components/board/company-search-result.tsx`

Props:

- `onActivate?: ((event: MouseEvent<HTMLAnchorElement, MouseEvent>) => void) | undefined`
- `selected?: boolean | undefined`
- `vm: CompanyCardVM`

### CompanySectionShell — `src/components/board/company-section-header.tsx`

Props:

- `activeSection: CompanySection`
- `children: ReactNode`
- `company: { name: string; slug: string; logoUrl: string | null; description: string | null; }`
- `hasSalaries: boolean`
- `jobCount: number`

### CopyLinkButton — `src/components/board/copy-link-button.tsx`

Props:

- `className?: string | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `size?: "sm" | "lg" | "md" | undefined`
- `url: string`

### CursorPagination — `src/components/board/cursor-pagination.tsx`

Previous/Next pagination for CURSOR-only listings — the blog archives, the
talent directory, and free-text company search. Their public SDK endpoints
page by opaque forward cursor (they reject `offset` and return no total
`count`), so numbered pages (`ListingPagination`) are impossible; this mirrors
the hosted board's Previous/Next affordance on the same shadcn pagination
primitives instead of a bespoke "load more" button.

`Next` is a real, crawlable anchor pointing at the next cursor URL (SEO); the
`onNext` handler upgrades the click to an in-app navigation. `Previous` has no
backward cursor to link to, so it walks router history back and disables on
the first page.

Props:

- `hasNext: boolean`
- `hasPrevious: boolean`
- `nextHref?: string | undefined`
- `onNext?: (() => void) | undefined`
- `onPrevious?: (() => void) | undefined`

### HomeLanding — `src/components/board/home-landing.tsx`

Props:

- `boardName: string`
- `candidatesEnabled: boolean`
- `categories?: HomeCategoryCard[] | undefined`
- `companies: HomeCompanyCard[]`
- `companiesCountLabel?: string | undefined`
- `employersEnabled: boolean`
- `jobs: JobCardVM[]`
- `jobsCountLabel?: string | undefined`
- `onSaveJob: (jobId: string) => Promise<void>`
- `posts: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`
- `postsCountLabel?: string | undefined`
- `publicJobSubmission?: boolean | undefined`
- `talent: { object: "talent_directory_entry"; handle: string | null; displayName: string | null; headline: string | null; locat…`
- `talentCountLabel?: string | undefined`
- `viewer: { emailVerified: boolean; } | null`

### JobAboutCompanyCard — `src/components/board/job-about-company-card.tsx`

Props:

- `company: JobDetailCompanyVM`

### JobCard — `src/components/board/job-card.tsx`

One job in a list — a typed-props display card (logo, title, company, location/type/salary badges, taxonomy chip-links) with no fetching. Shared by the job-search-page and job-detail (Similar jobs) blocks; exports jobDetailPath.

Usage: Feed each card a PublicJobCard from board.jobs.list()/search(). Links are plain <a> on the canonical paths (jobDetailPath → /companies/{companySlug}/jobs/{jobSlug}) — swap for your router's Link for client navigation.

Props:

- `action?: ReactNode`
- `compact?: boolean | undefined`
- `layout?: "card" | "row" | undefined`
- `linkTo?: "detail" | "workspace" | undefined`
- `vm: JobCardVM`

### JobDetail — `src/components/board/job-detail.tsx`

Full job page: breadcrumbs, header badges, facts, taxonomy chips, operator custom fields (CAV-294), sanitized description, company block, similar jobs. Server-renderable; apply/alert controls arrive via slots.

Usage: Load with board.jobs.retrieve(jobSlug) + board.jobs.similar(jobSlug). Pass @cavuno/apply-flow's ApplyButton through `actions` and @cavuno/alert-signup's form through `alertSlot`. Render JSON-LD (createJobPostingJsonLd from @cavuno/board/seo) in your route's head — head management is framework-specific.

Props:

- `alertSlot?: ReactNode`
- `applySlot?: ReactNode`
- `secondaryActions?: ReactNode`
- `similarSlot?: ReactNode`
- `vm: JobDetailVM`

### JobList — `src/components/board/job-list.tsx`

Props:

- `compact?: boolean | undefined`
- `jobs: JobCardVM[]`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `variant?: "grid" | "rows" | "compact" | undefined`

### JobSearchDetailState — `src/components/board/job-search-detail-state.tsx`

Props:

- `detail?: ReactNode`
- `errorTitle: string`
- `loadingLabel: string`
- `onRetry: () => void`
- `retryLabel: string`
- `status: "idle" | "loading" | "ready" | "error"`

### JobSearchPage — `src/components/board/job-search-page.tsx`

The board's main listing/search surface: heading + count, canonical filter controls (@cavuno/board/filters vocabulary), job cards, load-more. Data in, callbacks out — your loader owns fetching.

Usage: Fetch with board.jobs.list({ ...filters, cursor, limit: 20 }) (board.jobs.search() when q is set). onFiltersChange → write filters to URL search params and refetch; onLoadMore → refetch with nextCursor and append. Links are plain <a> on the canonical paths — swap for your router's Link for client navigation.

Props:

- `breadcrumb?: BreadcrumbData | undefined`
- `count?: number | undefined`
- `detail: ReactNode`
- `endAd?: AdPlacement | undefined`
- `filters: ListingFilters`
- `gatedCount?: number | undefined`
- `heading?: string | undefined`
- `jobs: JobCardVM[]`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onFiltersChange: (next: ListingFilters) => void`
- `onPageChange: (page: number) => void`
- `onSaveJob: (jobId: string) => Promise<void>`
- `onSelectedJobPush: (jobSlug: string) => void`
- `onSelectedJobReplace: (jobSlug: string) => void`
- `page: number`
- `pageSize: number`
- `relatedSearches?: RelatedSearch[] | undefined`
- `selectedJob?: string | undefined`
- `startAd?: AdPlacement | undefined`
- `viewer: { emailVerified: boolean; } | null`

### JobSearchResultDetail — `src/components/board/job-search-result-detail.tsx`

Props:

- `applySlot?: ReactNode`
- `loading?: boolean | undefined`
- `loadingLabel?: string | undefined`
- `saveSlot?: ReactNode`
- `vm: JobDetailVM`

### JobSearchResultDetailPending — `src/components/board/job-search-result-detail.tsx`

Props:

- `loadingLabel: string`

### JobSearchResult — `src/components/board/job-search-result.tsx`

Props:

- `onActivate?: ((event: MouseEvent<HTMLAnchorElement, MouseEvent>) => void) | undefined`
- `saveSlot?: ReactNode`
- `selected?: boolean | undefined`
- `vm: JobCardVM`

### JobsFilterControls — `src/components/board/jobs-filter-controls.tsx`

Props:

- `filters: ListingFilters`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onChange: (next: ListingFilters) => void`

### JobsFilterToolbar — `src/components/board/jobs-filter-toolbar.tsx`

Props:

- `labels: JobsFilterToolbarLabels`
- `onApply: (value: JobsFilterValues) => void`
- `onReset: () => void`
- `options: { workplace: JobsFilterOption[]; employmentType: JobsFilterOption[]; seniority: JobsFilterOption[]; }`
- `value: JobsFilterValues`

### JobsNotFound — `src/components/board/jobs-not-found.tsx`

The not-found state for the programmatic jobs pages (CAV-502). A visitor
can search a term and land on a slug that no longer resolves. The global
header remains the single keyword/location search owner, while this state
describes the failed search rather than exposing the missing taxonomy.

### JobsResultsBar — `src/components/board/jobs-results-bar.tsx`

Props:

- `className?: string | undefined`
- `count?: number | undefined`
- `heading?: string | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `page?: number | undefined`
- `pageSize?: number | undefined`

### ListingPageHeader — `src/components/board/listing-page-header.tsx`

Migration-only listing header for routes that predate the canonical
`PageHeader`. Do not use `ListingPageHeader` for new pages; compose the
header through the `Page` family and use `Bleed` when the band must span the
viewport. Existing listing routes retain this component until migrated.

The `search` slot still receives the shared `ListingSearchBand` (or a thin
wrapper of it), preserving current route behavior during that migration.

Props:

- `breadcrumb?: BreadcrumbData | undefined`
- `eyebrow?: ReactNode`
- `search?: ReactNode`
- `subtitle?: string | null | undefined`
- `title: string`

### ListingResultsHeader — `src/components/board/listing-page-header.tsx`

Props:

- `breadcrumb?: BreadcrumbData | undefined`
- `children: ReactNode`

### ListingSearchBand — `src/components/board/listing-page-header.tsx`

The ONE search band (CAV-502, CAV-517) — the white rounded panel that lives
inside every listing header: a keyword input with a leading search icon, an
inline clear (the X inside the field), and a primary Search button, with
optional slots for the extra controls a surface needs (the jobs location
field, or the facet-pill row). Companies, blog, jobs, and the not-found
headers all consume THIS markup — there is no duplicate search-band markup
anywhere.

SUBMIT-ONLY (CAV-517): the keyword is controlled local state owned by the
parent; `onChange` mutates only that state (never the URL), and the URL is
committed ONLY on form submit (Enter in the field or the Search button) via
`onSubmit`. The inline X clears the field locally (`onChange("")`) and
refocuses it — submit-only still applies, so clearing then requires a submit
to move the URL. This shell is shared by the local-state surfaces (companies,
blog, not-found) and the URL-seeded surface (jobs).

Props:

- `belowSlot?: ReactNode`
- `inputAriaLabel: string`
- `leadingSlot?: ReactNode`
- `onChange: (value: string) => void`
- `onSubmit: () => void`
- `placeholder: string`
- `searchAriaLabel?: string | undefined`
- `searchLabel: string`
- `value: string`

### ListingPagination — `src/components/board/listing-pagination.tsx`

Props:

- `compact?: boolean | undefined`
- `count: number`
- `hrefForPage: (page: number) => string`
- `onPageChange: (page: number) => void`
- `page: number`
- `pageSize: number`

### PageBody — `src/components/board/page-body.tsx`

Migration-only compatibility shell for detail surfaces that need a
full-bleed band and an optional sticky rail. Geometry is delegated to the
canonical Page family; global navigation context is owned by the root shell
breadcrumb.

Props:

- `band?: ReactNode`
- `children: ReactNode`
- `rail?: ReactNode`
- `railLabel?: string | undefined`

### PublicContentPending — `src/components/board/public-content-pending.tsx`

Props:

- `label: string`

### CompactCompanySalarySummary — `src/components/board/salary-sections.tsx`

Props:

- `title: string`
- `vm: OverallSalaryVM`

### CompanySalarySummary — `src/components/board/salary-sections.tsx`

Props:

- `categories: SalaryRailVM`
- `overall: OverallSalaryVM | null`
- `title: string`
- `viewAllHref: string`
- `viewAllLabel: string`

### OverallSalaryCard — `src/components/board/salary-sections.tsx`

Props:

- `vm: OverallSalaryVM`

### SalaryEmptyState — `src/components/board/salary-sections.tsx`

Props:

- `description?: string | undefined`
- `title: string`

### SalaryFaq — `src/components/board/salary-sections.tsx`

Props:

- `vm: SalaryFaqVM`

### SalaryRail — `src/components/board/salary-sections.tsx`

Props:

- `vm: SalaryRailVM`

### SenioritySalaryTable — `src/components/board/salary-sections.tsx`

Props:

- `vm: SeniorityTableVM`

### SaveJobButton — `src/components/board/save-job-button.tsx`

Props:

- `block?: boolean | undefined`
- `jobId: string`
- `labels: { save: string; saving: string; saved: string; error: string; }`
- `onSave: (jobId: string) => Promise<void>`
- `onSaved?: (() => void | Promise<void>) | undefined`
- `presentation?: "default" | "icon" | undefined`
- `returnTo: string`
- `viewer: { emailVerified: boolean; } | null`

### SearchDetailHeader — `src/components/board/search-detail-header.tsx`

The condensed (sticky) detail header shared by ALL three master/detail
search surfaces — jobs, companies, and talent. Each detail panel used to
hand-roll its own sticky row, so they drifted apart (different borders,
paddings, and whether the name was even a link). This is the one row they
all render now: the entity mark, the entity NAME, an optional one-line
subtitle, and the primary action(s).

The NAME links to that entity's own detail page when `nameHref` is set — a
job → its job-detail page, a company → its company page, a talent → their
`/p/{handle}` profile. The href is always a fully-resolved string from the
board view-model (never string-built here), so the component stays purely
presentational.

Geometry contract — it is seated inside `SearchResultDetailHeader`'s sticky
`h-16` anchor, so its own box is a single flush row that matches the shared
results-column surface:
 - Left inset only (`pl-5 md:pl-6`); NO right padding, so the action(s) sit
   flush with the pane's right edge instead of leaving the asymmetric gap
   the results list just removed.
 - A subtle hairline divider (`border-border/60`) under the backdrop-blur —
   an intentional, quiet separator rather than a heavy full-strength rule.

Props:

- `actions?: ReactNode`
- `mark?: ReactNode`
- `name: ReactNode`
- `nameHref?: string | null | undefined`
- `subtitle?: ReactNode`

### TalentProfileContent — `src/components/board/talent-profile-content.tsx`

Props:

- `headingAs?: "h1" | "h2" | undefined`
- `interactive?: boolean | undefined`
- `showHeader?: boolean | undefined`
- `showName?: boolean | undefined`
- `vm: TalentProfileVM`

### TalentProfileIdentity — `src/components/board/talent-profile-content.tsx`

The talent header block — the avatar + name + headline meta line + the
location/availability badge row. Modeled on the job-detail and
company-profile headers (`CompanySectionShell`, `JobDetail`): the mark sits
left of a stacked name → headline → badges column, so every entity page
opens the same way.

`size="xl"` drives the full-page hero band (a larger avatar + an `md:text-3xl`
title, matching the company/job hero); `size="lg"` is the condensed detail
pane. `nameHref` turns the NAME into the link to the canonical `/p/{handle}`
profile — the accessible route to the profile now that the "View profile"
button is gone. It is left null on the canonical page itself and whenever the
surface is a non-interactive placeholder.

Props:

- `headingAs?: "h1" | "h2" | undefined`
- `nameHref?: string | null | undefined`
- `showName?: boolean | undefined`
- `size?: "lg" | "xl" | undefined`
- `vm: TalentProfileVM`

### TalentSearchDetailState — `src/components/board/talent-search-detail-state.tsx`

Props:

- `detail?: ReactNode`
- `errorTitle: string`
- `loadingLabel: string`
- `onRetry: () => void`
- `retryLabel: string`
- `status: "idle" | "loading" | "ready" | "error"`

### TalentSearchPage — `src/components/board/talent-search-page.tsx`

Props:

- `candidates: TalentCardVM[]`
- `detail: ReactNode`
- `endAd?: AdPlacement | undefined`
- `hasPreviousResults?: boolean | undefined`
- `nextCursor?: string | null | undefined`
- `onNextResults?: (() => void) | undefined`
- `onPreviousResults?: (() => void) | undefined`
- `onSelectedTalentPush: (handle: string) => void`
- `onSelectedTalentReplace: (handle: string) => void`
- `q?: string | undefined`
- `selectedTalent?: string | undefined`
- `skill?: string | undefined`
- `startAd?: AdPlacement | undefined`

### TalentSearchResultDetail — `src/components/board/talent-search-result-detail.tsx`

Props:

- `cta?: TalentDetailCta | undefined`
- `interactive?: boolean | undefined`
- `vm: TalentProfileVM`

### TalentSearchResultDetailSkeleton — `src/components/board/talent-search-result-detail.tsx`

### TalentSearchResult — `src/components/board/talent-search-result.tsx`

Props:

- `onActivate?: ((event: MouseEvent<HTMLAnchorElement, MouseEvent>) => void) | undefined`
- `selected?: boolean | undefined`
- `vm: TalentCardVM`

### TaxonomyTags — `src/components/board/taxonomy-tags.tsx`

Props:

- `chips: TaxonomyChip[]`
- `className?: string | undefined`
- `overflow?: number | undefined`
- `size?: "sm" | "lg" | "md" | undefined`

### FacebookIcon — `src/components/brand-icons.tsx`

### GoogleIcon — `src/components/brand-icons.tsx`

Google's "G" in its required brand colours — an identity mark, so the fills
are deliberately literal rather than themed.

Props:

- `className?: string | undefined`

### LinkedInIcon — `src/components/brand-icons.tsx`

Props:

- `className?: string | undefined`

### XIcon — `src/components/brand-icons.tsx`

### CandidateProfilePendingPage — `src/components/candidate-route-state.tsx`

Pending state matching the /account profile layout (cards + right rail).

### CandidateRouteError — `src/components/candidate-route-state.tsx`

Props:

- `description: string`
- `navigationLabel: string`
- `reset: () => void`
- `retryLabel: string`
- `title: string`

### CandidateRouteErrorPage — `src/components/candidate-route-state.tsx`

### CandidateRoutePending — `src/components/candidate-route-state.tsx`

Props:

- `label: string`
- `withRail?: boolean | undefined`

### CandidateRoutePendingPage — `src/components/candidate-route-state.tsx`

### CandidateShell — `src/components/candidate-shell.tsx`

Thin wrapper for the candidate account pages. The account navigation moved to
the signed-in header avatar menu (CAV-510); this simply renders the page
content inside the shared account content shell. `title`/`description`/
`actions` render the canonical PageHeader; an optional `aside` (with its
accessible `asideLabel`) renders as the shell's complementary rail.

Props:

- `actions?: ReactNode`
- `aside?: ReactNode`
- `asideLabel?: string | undefined`
- `children: ReactNode`
- `description?: ReactNode`
- `title?: ReactNode`

### CompanyJobsSearchBar — `src/components/company-jobs-search-bar.tsx`

The company-jobs subpage search (CAV-501, CAV-511) — a thin wrapper of the
shared `ListingSearchBand`, so it is the SAME white panel the jobs,
companies, and blog headers use (no duplicate search-band markup). Scoped to
ONE company: it submits to that company's jobs subpage
(`/companies/$companySlug/jobs?q=&location=`), backed by the jobs SEARCH
endpoint with a `companyId` filter, or the BROWSE list when there is no
keyword. Submitting a fresh search drops `?page=`, resetting to page 1.

Location rides the band's `leadingSlot` — the same slot and the same
`LocationCombobox` the site header uses. The API's location filter is a geo
radius keyed by PLACE SLUG, so only a resolved suggestion is submittable;
the display name rides alongside as `locationName` purely so a cold load
rehydrates the input's text.

Props:

- `companySlug: string`
- `defaultValue?: string | undefined`
- `location?: { slug: string; name?: string | undefined; } | null | undefined`
- `locationSuggestions: LocationSuggestionState`

### CompanySearchCombobox — `src/components/company-search-combobox.tsx`

One unrestricted Companies search with canonical market suggestions.

Props:

- `className?: string | undefined`
- `loading: boolean`
- `onClear: () => void`
- `onQueryChange: (query: string) => void`
- `onSelect: (suggestion: CompanyMarketSuggestion) => void`
- `onValueChange: (value: string) => void`
- `placeholder: string`
- `suggestions: CompanyMarketSuggestion[]`
- `value: string`

### CustomFieldsGroup — `src/components/custom-fields-group.tsx`

Board-defined custom fields for the public posting form (ADR-0008: they
render as their own group after the built-in fields, in operator-config
order). Uncontrolled per-field values roll up into one `customFieldValues`
record keyed by the definition's immutable `key`; select values store
option KEYS, never labels — the same contract `resolveCustomFieldDisplay`
reads back on the job page.

Props:

- `definitions: { key: string; label: string; type: "number" | "boolean" | "short_text" | "long_text" | "single_select" | "multi_sele…`
- `onChange: (values: CustomFieldValues) => void`
- `values: CustomFieldValues`

### DangerZone — `src/components/danger-zone.tsx`

Danger zone — irreversible account delete (`board.me.delete()`). This is
ahead-of-hosted (no hosted candidate delete UI); the typed confirmation
guards against accidents. On success we clear the session and go home.

### EducationSection — `src/components/education-section.tsx`

Education — list + add/edit/delete, over `board.me.profile`'s
`listEducation` / `createEducation` / `updateEducation` /
`deleteEducation`. Dates are month-granular (stored as `YYYY-MM-01`).

Props:

- `items: { id: string; object: "candidate_education"; institutionName: string; institutionUrl: string | null; degree: string |…`
- `language: string`

### EmployerJobForm — `src/components/employer-job-form.tsx`

Props:

- `billingOptions: { id: string; object: "employer_billing_option"; type: "subscription" | "order"; planId: string; planName: string; pl…`
- `job?: ({ id: string; object: "employer_job"; title: string; slug: string | null; status: "draft" | "published" | "expired" …`
- `locale: string`
- `mode: EmployerJobFormMode`
- `officeLocationSuggestions: LocationSuggestionState`
- `plans: { object: "job_posting_plan"; id: string; name: string; description: string | null; kind: string; billingInterval: "m…`
- `remotePermits: { type: string; value: string; label: string; }[] | null`
- `slug: string`

### ApplicantPipelineBoard — `src/components/employer/applicant-pipeline-board.tsx`

The employer applicant pipeline as a KANBAN board. Columns are the
pipeline's visible stages in order; cards are applicants. Dragging a
card (pointer OR keyboard, via react-aria's `useDragAndDrop` + a
`GridList` per column) changes its stage through the same `moveApplicant`
server function the detail sheet's stage picker uses. Moves are
optimistic: the card jumps columns immediately and reverts on error.

Every other capability the flat list had stays reachable — the resume
link, stage picker, private-note field, activity timeline, and reject
action live in a per-card detail sheet; stage add/rename/delete live in
the board header and each column's menu (system stages are immutable).

Props:

- `actions: PipelineActions`
- `board: PipelineBoardVM`
- `defaultOpenCardId?: string | undefined`
- `defaultStageDialog?: StageDialogState | undefined`
- `jobId: string`
- `slug: string`

### EmptyState — `src/components/empty-state.tsx`

The canonical page/collection empty surface (see
docs/patterns/empty-state.md): a featured icon badge, a title, a
description, and one optional action, vertically centred in a consistent
`min-h-96` so "no saved jobs", "no applications", "no job alerts", and the
employer's "no jobs" all read at the same scale and placement instead of
each hand-rolling its own height and action styling.

Pass the action as a real Button (or a button-styled Link for navigation)
with a consistent variant — the board uses `outline` for the single
recovery action. Multi-action access gates and full-canvas search
not-found surfaces keep their own wrappers (JobsNotFound / SalaryEmptyState
/ the restricted-directory gate) rather than this single-action shape.

Props:

- `action?: ReactNode`
- `className?: string | undefined`
- `description: ReactNode`
- `icon: ReactNode`
- `title: ReactNode`

### ExperienceSection — `src/components/experience-section.tsx`

Work experience — list + add/edit/delete, over `board.me.profile`'s
`listExperience` / `createExperience` / `updateExperience` /
`deleteExperience`. The body is a merge-patch on edit (empty clears).
Dates are month-granular (stored as `YYYY-MM-01`); location offers board
place suggestions but stays a free string on the API.

Props:

- `items: { id: string; object: "candidate_experience"; title: string; companyName: string; companyUrl: string | null; location…`
- `language: string`
- `locationSuggestions: LocationSuggestionState`

### FloatingStackItem — `src/components/floating-stack.tsx`

A single widget in the floating stack. Portals into the shared container
when one is mounted (the running app) and renders inline as a graceful
fallback when it is not (isolated component tests). `order` controls the
vertical position within the stack — a lower value renders higher up.
`flush` opts an item into the bottom-edge slot: it forgoes the standard
bottom margin so it sits stuck to the viewport bottom (see the provider
doc); at most one item should be flush.

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `flush?: boolean | undefined`
- `order?: number | undefined`

### FloatingStackProvider — `src/components/floating-stack.tsx`

Shared bottom-right stacking region for floating widgets (the job-alert
prompt, the messaging dock, and any future corner widget). A single fixed
flex column that every widget portals into, so they stack vertically and
are collision-aware instead of overlapping in the same corner.

Bottom-edge model (the flush slot): the column is anchored at `bottom-0`
with NO container gap. Instead, every ordinary item owns a bottom margin
(`mb-4`) that does double duty — it both separates the item from whatever
sits below it AND floats the lowest ordinary item up off the viewport
edge. A `flush` item drops that margin, so it sticks to the bottom edge
(the messaging dock's rounded-top / flush-bottom look) while any item
stacked above it still keeps its `mb-4` gap and never overlaps. This lets
the dock be flush-bottom whether or not the job-alert prompt is present,
without the prompt losing its float margin when the dock is absent.

The container sits at `--z-floating-stack` (40) — below the
`--z-overlay` (50) layer (see the z-index scale in `src/styles.css`) — so
menus, popovers, and dialogs (which portal to the body at that overlay
level) still render above the stack. It is `pointer-events-none` so empty
gaps never trap clicks meant for the page; each item re-enables pointer
events.

Props:

- `children: ReactNode`

### JobAlertFloatingPrompt — `src/components/job-alert-floating-prompt.tsx`

The hosted board's dismissible bottom-corner job-alert prompt on listing
pages. Renders only after mount (avoids an SSR/client mismatch) and stays
hidden for 30 days after a dismiss (localStorage, mirroring the hosted
suppression cookie).

Props:

- `defaults: JobAlertDefaults`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`

### JsonLd — `src/components/json-ld.tsx`

Renders JSON-LD structured data as `<script type="application/ld+json">` in
the document. Rendered in the component body (not TanStack `head`, whose
`scripts` don't emit inline JSON-LD here).

The payload is API-derived (job titles, slugs, names), so every `<` is escaped
to `<` before injection — the standard JSON-LD hardening that prevents a
`</script>` in any string from breaking out of the tag (XSS). JSON-LD parsers
read the `<` escape transparently.

Props:

- `data: unknown[]`

### KeywordCombobox — `src/components/keyword-combobox.tsx`

Jobs keyword autocomplete: canonical terms plus an unrestricted text value.

Props:

- `className?: string | undefined`
- `loading: boolean`
- `onClear: () => void`
- `onQueryChange: (query: string) => void`
- `onSelect: (suggestion: KeywordSuggestionVM) => void`
- `onValueChange: (value: string) => void`
- `placeholder: string`
- `suggestions: KeywordSuggestionVM[]`
- `value: string`

### LanguagesSection — `src/components/languages-section.tsx`

Languages — name + proficiency entries over the whole-set replace
(`board.me.profile.updateLanguages`). Add opens a dialog, edit a right-hand
sheet — the same editor pattern as experience/education. Proficiency is a
free string on the API; the select offers the five common levels and keeps
any previously stored custom value selectable so an edit round-trip cannot
lose it.

Props:

- `languages: Language[]`

### LegalPageView — `src/components/legal-page.tsx`

Shared render for the legal/about surfaces. Per ADR-0039 the starter owns the
layout + JSON-LD; the Board API serves the portable-HTML prose (+ impressum
legal-entity facts).

Props:

- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `meta: LegalPageMeta`
- `origin: string`
- `page: { object: "legal_page"; type: string; title: string; content: string; contentFormat: "html"; legalEntity: { legalName…`

### LocationCombobox — `src/components/location-combobox.tsx`

Location search field — the hosted board's `board-place-search-field`: type a
place name, pick from resolved `places.list({ q })` autocomplete suggestions,
and apply its slug as the jobs location filter.

The route owns the debounced API request. This component composes the owned
shadcn Combobox and InputGroup primitives around that external async state.

Props:

- `className?: string | undefined`
- `inputClassName?: string | undefined`
- `loading: boolean`
- `onClear: () => void`
- `onQueryChange: (query: string) => void`
- `onSelect: (place: { slug: string; name: string; }) => void`
- `suggestions: LocationSuggestionVM[]`
- `value?: string | undefined`
- `valueLabel?: string | undefined`

### LocationSuggestField — `src/components/location-suggest-field.tsx`

Free-text location field with board place suggestions — the profile-form
variant of `LocationCombobox`. Profile locations are free strings on the
API, so unlike the jobs filter (which only commits a resolved place slug)
every keystroke IS the value; picking a suggestion just replaces it with
the resolved place name. The route owns the debounced suggestion request
and passes the `LocationSuggestionState` down.

Props:

- `className?: string | undefined`
- `id: string`
- `loading: boolean`
- `onQueryChange: (query: string) => void`
- `onValueChange: (text: string) => void`
- `placeholder?: string | undefined`
- `searchingText: string`
- `suggestions: LocationSuggestionVM[]`
- `value: string`

### DitherCanvas — `src/components/marketing/dither-canvas.tsx`

The decorative hero dithering band — the real paper.design Dithering
shader (https://shaders.paper.design/dithering), tuned for Stripe-landing
restraint: a faint, theme-coloured texture behind a headline, never a
poster. Content contrast always wins.

 - Theme-driven: the `--foreground` token (which the browser reports as
   `oklch(…)`, a format paper's colour parser rejects) is round-tripped to
   an `rgb()` string through a 1×1 2D canvas at mount and re-read on theme
   flips, so light/dark just work.
 - Kept faint via a low element opacity — the shader's own output is a
   hard two-colour field; the opacity is what makes it a texture.
 - Static under `prefers-reduced-motion`; a slow drift otherwise.
 - Client-only + WebGL2-guarded: the band's plain background is the
   graceful fallback on the server, in jsdom, or where WebGL2 is
   unavailable, so we never mount a shader that cannot draw.
 - Decorative: `aria-hidden`, non-interactive.

The public API is a single `className` (positioning/sizing owned by the
caller), unchanged from the previous canvas-2D implementation so every
consumer is a drop-in.

Props:

- `className?: string | undefined`

### MessagesNavLink — `src/components/messages-nav-link.tsx`

Props:

- `unreadCount: number`

### Avatar — `src/components/messages/avatar.tsx`

Round avatar with an initials fallback — used across the messaging
surface. Thin wrapper over the owned shadcn Avatar so callsites keep
the messaging-domain API (url + name).

Props:

- `className?: string | undefined`
- `name: string`
- `url: string | null`

### BlockedList — `src/components/messages/blocked-list.tsx`

Props:

- `emptyText?: string | undefined`
- `onUnblock: (boardUserId: string) => void`
- `pendingUserId: string | null`
- `users: { id: string; object: "blocked_user"; boardUserId: string; displayName: string; avatarUrl: string | null; createdAt: …`

### Composer — `src/components/messages/composer.tsx`

Reply composer. Disabled (not hidden) with a reason hint when the viewer is
blocked or the cold-message rule is in effect — mirrors the hosted board.

Props:

- `disabled: boolean`
- `hint: string | null`
- `onSend: (body: string) => Promise<void>`
- `onSent: () => void`

### HydrationSafeDate — `src/components/messages/hydration-safe-date.tsx`

Props:

- `children?: ((formatted: string) => ReactNode) | undefined`
- `iso: string`
- `now?: number | undefined`
- `presentation: DatePresentation`

### InboxList — `src/components/messages/inbox-list.tsx`

Props:

- `archived: boolean`
- `conversations: { id: string; object: "conversation"; lastMessageAt: string; lastMessageSnippet: string; lastMessageAuthorBoardUserId…`
- `emptyText?: string | undefined`
- `hasMore: boolean`
- `loadingMore: boolean`
- `onLoadMore: () => void`
- `onSelect?: ((conversationId: string) => void) | undefined`
- `selectedConversationId?: string | undefined`

### MessageBubble — `src/components/messages/message-bubble.tsx`

Props:

- `message: { id: string; object: "message"; conversationId: string; authorBoardUserId: string; recipientBoardUserId: string; bod…`
- `onChanged: () => void`
- `onEdit: (body: string) => Promise<unknown>`
- `onReport: (reason: Reason) => Promise<unknown>`
- `onReported: () => void`
- `onUnsend: () => Promise<unknown>`
- `own: boolean`
- `showSeen: boolean`

### MessagingDock — `src/components/messages/messaging-dock.tsx`

Props:

- `closeConversationLabel: string`
- `conversation?: ReactNode`
- `conversationHasOwnHeader?: boolean | undefined`
- `conversationLabel: string`
- `inbox: ReactNode`
- `messagesLabel: string`
- `minimizeMessagesLabel: string`
- `onCloseConversation: () => void`
- `onOpenChange: (open: boolean) => void`
- `open: boolean`
- `openMessagesLabel: string`
- `unreadCount: number`

### MessagingLayout — `src/components/messages/messaging-layout.tsx`

Props:

- `aria-label: string`
- `className?: string | undefined`
- `conversation: ReactNode`
- `conversationLabel?: string | undefined`
- `list: ReactNode`
- `listLabel?: string | undefined`
- `mobilePane: "list" | "conversation"`

### ThreadView — `src/components/messages/thread-view.tsx`

Props:

- `blocked: boolean`
- `companyHref?: string | undefined`
- `conversation: { id: string; object: "conversation"; lastMessageAt: string; lastMessageSnippet: string; lastMessageAuthorBoardUserId…`
- `messages: { id: string; object: "message"; conversationId: string; authorBoardUserId: string; recipientBoardUserId: string; bod…`
- `onArchive: () => Promise<unknown>`
- `onBack?: (() => void) | undefined`
- `onBlock: () => Promise<unknown>`
- `onClose?: (() => void) | undefined`
- `onEditMessage: (messageId: string, body: string) => Promise<unknown>`
- `onRefresh: () => void`
- `onReported: () => void`
- `onReportMessage: (messageId: string, reason: ReportReason) => Promise<unknown>`
- `onSend: (body: string) => Promise<void>`
- `onUnarchive: () => Promise<unknown>`
- `onUnblock: () => Promise<unknown>`
- `onUnsendMessage: (messageId: string) => Promise<unknown>`
- `statusError?: string | null | undefined`

### MonthYearField — `src/components/month-year-field.tsx`

Props:

- `defaultValue?: string | undefined`
- `idPrefix: string`
- `label: string`
- `language: string`
- `monthAriaLabel: string`
- `monthPlaceholder: string`
- `onChange: (value: string) => void`
- `required?: boolean | undefined`
- `yearAriaLabel: string`
- `yearPlaceholder: string`

### NavigationProgress — `src/components/navigation-progress.tsx`

### NotificationSettings — `src/components/notification-settings.tsx`

Email notification toggles — one checkbox per channel over
`board.me.notificationPreferences` (retrieve / update). Each toggle
PUTs immediately and refreshes.

Props:

- `preferences: { object: "notification_preference"; channel: "messageEmails" | "applicationEmails"; subscribed: boolean; updatedAt: …`

### EmbeddedCheckout — `src/components/paywall/embedded-checkout.tsx`

Props:

- `kit: { object: "checkout_session"; sessionId: string; clientSecret: string; stripeAccountId: string; publishableKey: strin…`
- `onComplete?: (() => void) | undefined`

### PlaceTagsField — `src/components/place-tags-field.tsx`

Multi-place picker: committed places render as removable tags over one
board place-suggest input (the SDK `places.list({ q })` autocomplete the
route owns via `useLocationSuggestions`). Suggestion picks commit resolved
places; when the caller passes `onAddFreeText`, pressing Enter on
unresolved text commits it verbatim (the job-posting payload accepts
display-name-only office locations). Enter never submits the host form.

Props:

- `className?: string | undefined`
- `id: string`
- `loading: boolean`
- `onAddFreeText?: ((text: string) => void) | undefined`
- `onAddSuggestion: (place: LocationSuggestionVM) => void`
- `onQueryChange: (query: string) => void`
- `onRemove: (key: string) => void`
- `placeholder?: string | undefined`
- `removeAriaLabel: (label: string) => string`
- `searchingText: string`
- `suggestions: LocationSuggestionVM[]`
- `tags: PlaceTag[]`

### PostCard — `src/components/post-card.tsx`

One crawlable blog summary. The card keeps post, tag, and every author as
real links so a compact archive never throws away the blog's discovery
graph. Long editorial labels wrap instead of being replaced by ellipses.

Props:

- `post: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`

### PostJobForm — `src/components/post-job-form.tsx`

Props:

- `customFields: { key: string; label: string; type: "number" | "boolean" | "short_text" | "long_text" | "single_select" | "multi_sele…`
- `initialPlanId?: string | undefined`
- `locale: string`
- `officeLocationSuggestions: LocationSuggestionState`
- `onCheckout: (url: string) => void`
- `onLogoFetch: (domain: string) => Promise<LogoResult>`
- `onLogoUpload: (data: FormData) => Promise<LogoResult>`
- `onSubmit: (input: JobPostingFormInput) => Promise<SubmitJobResult>`
- `plans: { object: "job_posting_plan"; id: string; name: string; description: string | null; kind: string; billingInterval: "m…`
- `remotePermits: { type: string; value: string; label: string; }[] | null`

### PreviewBoardSettingsSheet — `src/components/preview/preview-board-settings.tsx`

The "Board settings" surface — the sandbox analog of the dashboard's board
settings (spec §4b item 5), split out of the persona menu into its own
focused sheet (progressive disclosure: the persona popover does ONE job, the
flag controls live behind their own affordance). Reached from the toolbar
footer's gear and controlled by the parent; closing it returns to nothing
— it never re-opens the persona menu.

The optimistic-update + error-banner behavior moved here verbatim from the
old inline section: each control adopts the picked value immediately
(`optimisticConfig`) instead of disable→revert→snap while the PATCH + loader
refetch round-trips, and a rejected PATCH surfaces the banner and does NOT
invalidate, so the control reverts to the real `config` prop.

Props:

- `config: PreviewBoardConfig`
- `onOpenChange: (open: boolean) => void`
- `open: boolean`

### PreviewEmailsSheet — `src/components/preview/preview-emails.tsx`

The "Emails" panel — a Mailpit/letter_opener-style viewer for the sandbox's
captured outbound mail (spec §4b). A Sheet triggered from inside the preview
toolbar: every board email (magic links, verification, alert-manage HMAC
URLs, digests) is listed newest-first in a compact master list, and
selecting one opens a workbench detail — a metadata header (To / Subject /
Type / Received) above the rendered body — so a preview session can complete
flows that normally need an inbox.

The body is framed in a SANDBOXED iframe (`srcdoc`, `sandbox=""`, no
scripts): an email is a standalone document, so framing it keeps its own
inline styles from bleeding into the app and keeps the app's styles from
distorting it. AGENTS.md hard rule 4 holds — the platform HTML is handed to
`srcDoc` as-is, never interpolated with other strings.

Data arrives from the `listSandboxEmails` server function on demand (open /
refresh) — the same scriptable seam agents drive headlessly, and the reason
it is not preloaded into the root loader on every page. The server fn is
sandbox-gated and returns `[]` off the sandbox, so the panel is inert there.

Props:

- `disabled?: boolean | undefined`
- `onOpenChange?: ((open: boolean) => void) | undefined`
- `open?: boolean | undefined`

### PreviewToolbar — `src/components/preview/preview-toolbar.tsx`

The developer-preview toolbar — Workstream B of the sandbox-preview-state
spec. A floating, unobtrusive pill that renders ONLY when the server-side
capability check passes (`sandbox: true`), never on a tenant board.

Information architecture (Stripe test-mode helper pattern): the pill anchors
a persistent mode indicator whose PRIMARY surface does one job — switch
persona. Everything else is progressive disclosure behind the popover's
footer action row, each in its own focused surface:
  - Board settings → its own sheet (`PreviewBoardSettingsSheet`)
  - Emails         → its own sheet (`PreviewEmailsSheet`)
  - Reseed         → a confirm dialog
  - Exit preview   → immediate sign-out + reload
Opening any of them dismisses the persona menu; closing them returns to
nothing (never re-opens the menu). The same server functions are scriptable
headlessly for agents (spec §3.7).

Positioned bottom-LEFT to clear the app's own bottom-right chrome (the
messages dock at `right-6 bottom-0`, the job-alert prompt at `right-4
bottom-4`) — "must not collide with the app's own chrome" wins over the
nominal bottom-right ask.

Props:

- `capability: PreviewCapability`
- `config: PreviewBoardConfig`
- `personas: PreviewPersona[]`
- `viewer: PreviewViewer | null`

### ProfileCompletenessCard — `src/components/profile-completeness-card.tsx`

Profile-completeness rail card: one progress read-out over the checklist of
profile parts. The resume itself uploads via the page-header "Import resume"
dialog; the rail only tracks it. The caller derives the checklist from the
account loader data; this stays pure presentation.

Props:

- `items: ProfileChecklistItem[]`

### ProfileForm — `src/components/profile-form.tsx`

Profile edit form — recreates the hosted `/account` profile editor. One
merge-patch via `board.me.profile.update`; handle availability is probed
live on blur (`board.me.profile.handleAvailable`). The display-name field
is part of the same patch (the SDK hides the two-mutation split).

Props:

- `locationSuggestions: LocationSuggestionState`
- `profile: { id: string; object: "candidate_profile"; displayName: string | null; bio: string | null; avatarUrl: string | null; …`

### Prose — `src/components/prose.tsx`

Props:

- `as?: ElementType | undefined`
- `children?: ReactNode`
- `html?: string | undefined`

### ResumeImportDialog — `src/components/resume-import-dialog.tsx`

"Import resume" page-header action: the resume pipeline (upload → parse →
keep-on-file) lives in a dialog instead of a page section — mirroring the
hosted board's resume upload modal.

Props:

- `resume: { object: "resume"; parseStatus: "parsing" | "parsed" | "failed" | null; parseFailureReason: string | null; parsedAt:…`

### ResumeUpload — `src/components/resume-upload.tsx`

Props:

- `resume: { object: "resume"; parseStatus: "parsing" | "parsed" | "failed" | null; parseFailureReason: string | null; parsedAt:…`
- `variant?: "section" | "embedded" | undefined`

### RheaAuthCard — `src/components/rhea-auth-pilot.tsx`

Props:

- `announceTitle?: boolean | undefined`
- `children: ReactNode`
- `supportingText?: ReactNode`
- `title: string`

### RheaRegistrationPage — `src/components/rhea-auth-pilot.tsx`

Props:

- `copy: RegistrationCopy`
- `footer?: ReactNode`
- `onSubmit: (values: { displayName: string; email: string; password: string; }) => Promise<RegistrationResult>`
- `successHref: string`
- `supportingText: ReactNode`
- `title: string`

### RoleSelector — `src/components/rhea-auth-pilot.tsx`

Props:

- `ariaLabel: string`
- `candidateBody: string`
- `candidateTitle: string`
- `employerBody: string`
- `employerTitle: string`
- `onValueChange: (value: "candidate" | "employer") => void`
- `value: "candidate" | "employer"`

### RichTextEditor — `src/components/rich-text-editor.tsx`

Props:

- `ariaLabel: string`
- `maxCharacters?: number | undefined`
- `onChange: (html: string) => void`
- `value: string`

### AdRail — `src/components/search-results/ad-rail.tsx`

A provider-neutral 160 × 600 advertising seam for very wide viewports.

Props:

- `children: ReactNode`
- `label: string`
- `side?: "start" | "end" | undefined`

### SearchResultCard — `src/components/search-results/search-result-card.tsx`

Shared compact interaction chrome; entity components own all card meaning.

Props:

- `selected?: boolean | undefined`

### SearchResultDetail — `src/components/search-results/search-result-detail.tsx`

The desktop-only, independently scrolling detail projection.

Props:

- `children: ReactNode`
- `label: string`
- `scrollRestorationId?: string | undefined`

### SearchResultDetailHeader — `src/components/search-results/search-result-detail.tsx`

Props:

- `compact: ReactNode`
- `expanded: ReactNode`

### SearchResultsLayout — `src/components/search-results/search-results-layout.tsx`

Responsive master–detail geometry with optional outer advertising rails.

Props:

- `detail: ReactNode`
- `endAd?: ReactElement<AdRailProps, string | JSXElementConstructor<any>> | undefined`
- `list: ReactNode`
- `startAd?: ReactElement<AdRailProps, string | JSXElementConstructor<any>> | undefined`

### SearchResultsList — `src/components/search-results/search-results-list.tsx`

The independently scrolling master region of a search-results surface.

Props:

- `children: ReactNode`
- `label: string`
- `scrollRestorationId?: string | undefined`

### MainContentTarget — `src/components/shell-accessibility.tsx`

### SkipToContentLink — `src/components/shell-accessibility.tsx`

Props:

- `label: string`

### SkillsSection — `src/components/skills-section.tsx`

Skills — badges over the whole-set replace
(`board.me.profile.updateSkills`). Adding happens in an "Add skill" dialog
(the LinkedIn flow); add and remove each persist immediately with one PUT.

Props:

- `skills: string[]`

### TalentCard — `src/components/talent-card.tsx`

Props:

- `candidate: { object: "talent_directory_entry"; handle: string | null; displayName: string | null; headline: string | null; locat…`

### Text — `src/components/text.tsx`

Props:

- `as?: TextElement | undefined`
- `bold?: boolean | undefined`
- `children?: ReactNode`
- `className?: string | undefined`
- `size?: BodySize | undefined`
- `truncate?: boolean | undefined`
- `variant?: HeadingVariant | BodyVariant | undefined`

### Accordion — `src/components/ui/accordion.tsx`

### AccordionContent — `src/components/ui/accordion.tsx`

### AccordionItem — `src/components/ui/accordion.tsx`

### AccordionTrigger — `src/components/ui/accordion.tsx`

### AlertDialog — `src/components/ui/alert-dialog.tsx`

### AlertDialogAction — `src/components/ui/alert-dialog.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### AlertDialogCancel — `src/components/ui/alert-dialog.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### AlertDialogContent — `src/components/ui/alert-dialog.tsx`

Props:

- `size?: "default" | "sm" | undefined`

### AlertDialogDescription — `src/components/ui/alert-dialog.tsx`

### AlertDialogFooter — `src/components/ui/alert-dialog.tsx`

### AlertDialogHeader — `src/components/ui/alert-dialog.tsx`

### AlertDialogMedia — `src/components/ui/alert-dialog.tsx`

### AlertDialogOverlay — `src/components/ui/alert-dialog.tsx`

### AlertDialogPortal — `src/components/ui/alert-dialog.tsx`

### AlertDialogTitle — `src/components/ui/alert-dialog.tsx`

### AlertDialogTrigger — `src/components/ui/alert-dialog.tsx`

### Alert — `src/components/ui/alert.tsx`

Props:

- `variant?: "default" | "destructive" | null | undefined`

Variants — `variant`: default, destructive

### AlertAction — `src/components/ui/alert.tsx`

### AlertDescription — `src/components/ui/alert.tsx`

### AlertTitle — `src/components/ui/alert.tsx`

### AspectRatio — `src/components/ui/aspect-ratio.tsx`

Props:

- `ratio: number`

### Attachment — `src/components/ui/attachment.tsx`

Props:

- `orientation?: "horizontal" | "vertical" | null | undefined`
- `size?: "default" | "sm" | "xs" | null | undefined`
- `state?: "idle" | "error" | "done" | "uploading" | "processing" | undefined`

Variants — `size`: default, sm, xs

Variants — `orientation`: horizontal, vertical

### AttachmentAction — `src/components/ui/attachment.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### AttachmentActions — `src/components/ui/attachment.tsx`

### AttachmentContent — `src/components/ui/attachment.tsx`

### AttachmentDescription — `src/components/ui/attachment.tsx`

### AttachmentGroup — `src/components/ui/attachment.tsx`

### AttachmentMedia — `src/components/ui/attachment.tsx`

Props:

- `variant?: "icon" | "image" | null | undefined`

Variants — `variant`: icon, image

### AttachmentTitle — `src/components/ui/attachment.tsx`

### AttachmentTrigger — `src/components/ui/attachment.tsx`

### Avatar — `src/components/ui/avatar.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "xl" | undefined`

### AvatarBadge — `src/components/ui/avatar.tsx`

### AvatarFallback — `src/components/ui/avatar.tsx`

### AvatarGroup — `src/components/ui/avatar.tsx`

### AvatarGroupCount — `src/components/ui/avatar.tsx`

### AvatarImage — `src/components/ui/avatar.tsx`

### Badge — `src/components/ui/badge.tsx`

Props:

- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

Variants — `variant`: default, secondary, destructive, outline, ghost, link

### Breadcrumb — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbEllipsis — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbItem — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbLink — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbList — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbPage — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### BreadcrumbSeparator — `src/components/ui/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

### Bubble — `src/components/ui/bubble.tsx`

Props:

- `align?: "start" | "end" | undefined`
- `variant?: "default" | "muted" | "secondary" | "outline" | "ghost" | "destructive" | "tinted" | null | undefined`

Variants — `variant`: default, secondary, muted, tinted, outline, ghost, destructive

### BubbleContent — `src/components/ui/bubble.tsx`

### BubbleGroup — `src/components/ui/bubble.tsx`

### BubbleReactions — `src/components/ui/bubble.tsx`

Props:

- `align?: "start" | "end" | undefined`
- `side?: "top" | "bottom" | undefined`

Variants — `side`: top, bottom

Variants — `align`: start, end

### ButtonGroup — `src/components/ui/button-group.tsx`

Props:

- `orientation?: "horizontal" | "vertical" | null | undefined`

Variants — `orientation`: horizontal, vertical

### ButtonGroupSeparator — `src/components/ui/button-group.tsx`

### ButtonGroupText — `src/components/ui/button-group.tsx`

### Button — `src/components/ui/button.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

Variants — `variant`: default, outline, secondary, ghost, destructive, link

Variants — `size`: default, xs, sm, lg, icon, 'icon-xs', 'icon-sm', 'icon-lg'

### Calendar — `src/components/ui/calendar.tsx`

Props:

- `buttonVariant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### CalendarDayButton — `src/components/ui/calendar.tsx`

Props:

- `locale?: Partial<DayPickerLocale> | undefined`

### Card — `src/components/ui/card.tsx`

Props:

- `size?: "default" | "sm" | undefined`
- `variant?: "default" | "elevated" | undefined`

### CardAction — `src/components/ui/card.tsx`

### CardContent — `src/components/ui/card.tsx`

### CardDescription — `src/components/ui/card.tsx`

### CardFooter — `src/components/ui/card.tsx`

### CardHeader — `src/components/ui/card.tsx`

### CardTitle — `src/components/ui/card.tsx`

### Carousel — `src/components/ui/carousel.tsx`

Props:

- `opts?: Partial<OptionsType> | undefined`
- `orientation?: "horizontal" | "vertical" | undefined`
- `plugins?: CreatePluginType<LoosePluginType, {}>[] | undefined`
- `setApi?: ((api: EmblaCarouselType | undefined) => void) | undefined`

### CarouselContent — `src/components/ui/carousel.tsx`

### CarouselItem — `src/components/ui/carousel.tsx`

### CarouselNext — `src/components/ui/carousel.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### CarouselPrevious — `src/components/ui/carousel.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### ChartContainer — `src/components/ui/chart.tsx`

Props:

- `config: ChartConfig`
- `initialDimension?: { width: number; height: number; } | undefined`

### ChartLegend — `src/components/ui/chart.tsx`

### ChartLegendContent — `src/components/ui/chart.tsx`

Props:

- `hideIcon?: boolean | undefined`
- `nameKey?: string | undefined`

### ChartStyle — `src/components/ui/chart.tsx`

Props:

- `config: ChartConfig`
- `id: string`

### ChartTooltip — `src/components/ui/chart.tsx`

### ChartTooltipContent — `src/components/ui/chart.tsx`

Props:

- `hideIndicator?: boolean | undefined`
- `hideLabel?: boolean | undefined`
- `indicator?: "line" | "dot" | "dashed" | undefined`
- `labelKey?: string | undefined`
- `nameKey?: string | undefined`

### Checkbox — `src/components/ui/checkbox.tsx`

### Collapsible — `src/components/ui/collapsible.tsx`

### CollapsibleContent — `src/components/ui/collapsible.tsx`

### CollapsibleTrigger — `src/components/ui/collapsible.tsx`

### Combobox — `src/components/ui/combobox.tsx`

### ComboboxChip — `src/components/ui/combobox.tsx`

Props:

- `showRemove?: boolean | undefined`

### ComboboxChips — `src/components/ui/combobox.tsx`

### ComboboxChipsInput — `src/components/ui/combobox.tsx`

### ComboboxCollection — `src/components/ui/combobox.tsx`

### ComboboxContent — `src/components/ui/combobox.tsx`

### ComboboxEmpty — `src/components/ui/combobox.tsx`

### ComboboxGroup — `src/components/ui/combobox.tsx`

### ComboboxInput — `src/components/ui/combobox.tsx`

Props:

- `anchorRef?: Ref<HTMLDivElement> | undefined`
- `showClear?: boolean | undefined`
- `showTrigger?: boolean | undefined`

### ComboboxItem — `src/components/ui/combobox.tsx`

### ComboboxLabel — `src/components/ui/combobox.tsx`

### ComboboxList — `src/components/ui/combobox.tsx`

### ComboboxSeparator — `src/components/ui/combobox.tsx`

### ComboboxTrigger — `src/components/ui/combobox.tsx`

### ComboboxValue — `src/components/ui/combobox.tsx`

### Command — `src/components/ui/command.tsx`

### CommandDialog — `src/components/ui/command.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `description?: string | undefined`
- `showCloseButton?: boolean | undefined`
- `title?: string | undefined`

### CommandEmpty — `src/components/ui/command.tsx`

### CommandGroup — `src/components/ui/command.tsx`

### CommandInput — `src/components/ui/command.tsx`

### CommandItem — `src/components/ui/command.tsx`

### CommandList — `src/components/ui/command.tsx`

### CommandSeparator — `src/components/ui/command.tsx`

### CommandShortcut — `src/components/ui/command.tsx`

### ContextMenu — `src/components/ui/context-menu.tsx`

### ContextMenuCheckboxItem — `src/components/ui/context-menu.tsx`

Props:

- `inset?: boolean | undefined`

### ContextMenuContent — `src/components/ui/context-menu.tsx`

### ContextMenuGroup — `src/components/ui/context-menu.tsx`

### ContextMenuItem — `src/components/ui/context-menu.tsx`

Props:

- `inset?: boolean | undefined`
- `variant?: "default" | "destructive" | undefined`

### ContextMenuLabel — `src/components/ui/context-menu.tsx`

Props:

- `inset?: boolean | undefined`

### ContextMenuPortal — `src/components/ui/context-menu.tsx`

### ContextMenuRadioGroup — `src/components/ui/context-menu.tsx`

### ContextMenuRadioItem — `src/components/ui/context-menu.tsx`

Props:

- `inset?: boolean | undefined`

### ContextMenuSeparator — `src/components/ui/context-menu.tsx`

### ContextMenuShortcut — `src/components/ui/context-menu.tsx`

### ContextMenuSub — `src/components/ui/context-menu.tsx`

### ContextMenuSubContent — `src/components/ui/context-menu.tsx`

### ContextMenuSubTrigger — `src/components/ui/context-menu.tsx`

Props:

- `inset?: boolean | undefined`

### ContextMenuTrigger — `src/components/ui/context-menu.tsx`

### Dialog — `src/components/ui/dialog.tsx`

### DialogClose — `src/components/ui/dialog.tsx`

### DialogContent — `src/components/ui/dialog.tsx`

Props:

- `showCloseButton?: boolean | undefined`

### DialogDescription — `src/components/ui/dialog.tsx`

### DialogFooter — `src/components/ui/dialog.tsx`

### DialogHeader — `src/components/ui/dialog.tsx`

### DialogOverlay — `src/components/ui/dialog.tsx`

### DialogPortal — `src/components/ui/dialog.tsx`

### DialogTitle — `src/components/ui/dialog.tsx`

### DialogTrigger — `src/components/ui/dialog.tsx`

### DirectionProvider — `src/components/ui/direction.tsx`

Enables RTL behavior for Base UI components.

Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)

### Drawer — `src/components/ui/drawer.tsx`

Props:

- `showSwipeHandle?: boolean | undefined`

### DrawerClose — `src/components/ui/drawer.tsx`

### DrawerContent — `src/components/ui/drawer.tsx`

### DrawerDescription — `src/components/ui/drawer.tsx`

### DrawerFooter — `src/components/ui/drawer.tsx`

### DrawerHeader — `src/components/ui/drawer.tsx`

### DrawerOverlay — `src/components/ui/drawer.tsx`

### DrawerPortal — `src/components/ui/drawer.tsx`

### DrawerSwipeHandle — `src/components/ui/drawer.tsx`

### DrawerTitle — `src/components/ui/drawer.tsx`

### DrawerTrigger — `src/components/ui/drawer.tsx`

### DropdownMenu — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuCheckboxItem — `src/components/ui/dropdown-menu.tsx`

Props:

- `inset?: boolean | undefined`

### DropdownMenuContent — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuGroup — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuItem — `src/components/ui/dropdown-menu.tsx`

Props:

- `inset?: boolean | undefined`
- `variant?: "default" | "destructive" | undefined`

### DropdownMenuLabel — `src/components/ui/dropdown-menu.tsx`

Props:

- `inset?: boolean | undefined`

### DropdownMenuPortal — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuRadioGroup — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuRadioItem — `src/components/ui/dropdown-menu.tsx`

Props:

- `inset?: boolean | undefined`

### DropdownMenuSeparator — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuShortcut — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuSub — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuSubContent — `src/components/ui/dropdown-menu.tsx`

### DropdownMenuSubTrigger — `src/components/ui/dropdown-menu.tsx`

Props:

- `inset?: boolean | undefined`

### DropdownMenuTrigger — `src/components/ui/dropdown-menu.tsx`

### Empty — `src/components/ui/empty.tsx`

### EmptyContent — `src/components/ui/empty.tsx`

### EmptyDescription — `src/components/ui/empty.tsx`

### EmptyHeader — `src/components/ui/empty.tsx`

### EmptyMedia — `src/components/ui/empty.tsx`

Props:

- `variant?: "default" | "icon" | null | undefined`

Variants — `variant`: default, icon

### EmptyTitle — `src/components/ui/empty.tsx`

### Field — `src/components/ui/field.tsx`

Props:

- `orientation?: "horizontal" | "vertical" | "responsive" | null | undefined`

Variants — `orientation`: vertical, horizontal, responsive

### FieldContent — `src/components/ui/field.tsx`

### FieldDescription — `src/components/ui/field.tsx`

### FieldError — `src/components/ui/field.tsx`

Props:

- `errors?: ({ message?: string | undefined; } | undefined)[] | undefined`

### FieldGroup — `src/components/ui/field.tsx`

### FieldLabel — `src/components/ui/field.tsx`

### FieldLegend — `src/components/ui/field.tsx`

Props:

- `variant?: "label" | "legend" | undefined`

### FieldSeparator — `src/components/ui/field.tsx`

### FieldSet — `src/components/ui/field.tsx`

### FieldTitle — `src/components/ui/field.tsx`

### HoverCard — `src/components/ui/hover-card.tsx`

### HoverCardContent — `src/components/ui/hover-card.tsx`

### HoverCardTrigger — `src/components/ui/hover-card.tsx`

### InputGroup — `src/components/ui/input-group.tsx`

### InputGroupAddon — `src/components/ui/input-group.tsx`

Props:

- `align?: "inline-start" | "inline-end" | "block-start" | "block-end" | null | undefined`

Variants — `align`: 'inline-start', 'inline-end', 'block-start', 'block-end'

### InputGroupButton — `src/components/ui/input-group.tsx`

Props:

- `size?: "sm" | "xs" | "icon-xs" | "icon-sm" | null | undefined`
- `type?: "button" | "submit" | "reset" | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

Variants — `size`: xs, sm, 'icon-xs', 'icon-sm'

### InputGroupInput — `src/components/ui/input-group.tsx`

### InputGroupText — `src/components/ui/input-group.tsx`

### InputGroupTextarea — `src/components/ui/input-group.tsx`

### InputOTP — `src/components/ui/input-otp.tsx`

### InputOTPGroup — `src/components/ui/input-otp.tsx`

### InputOTPSeparator — `src/components/ui/input-otp.tsx`

### InputOTPSlot — `src/components/ui/input-otp.tsx`

Props:

- `index: number`

### Input — `src/components/ui/input.tsx`

### Item — `src/components/ui/item.tsx`

Props:

- `size?: "default" | "sm" | "xs" | null | undefined`
- `variant?: "default" | "muted" | "outline" | null | undefined`

Variants — `variant`: default, outline, muted

Variants — `size`: default, sm, xs

### ItemActions — `src/components/ui/item.tsx`

### ItemContent — `src/components/ui/item.tsx`

### ItemDescription — `src/components/ui/item.tsx`

### ItemFooter — `src/components/ui/item.tsx`

### ItemGroup — `src/components/ui/item.tsx`

### ItemHeader — `src/components/ui/item.tsx`

### ItemMedia — `src/components/ui/item.tsx`

Props:

- `variant?: "default" | "icon" | "image" | null | undefined`

Variants — `variant`: default, icon, image

### ItemSeparator — `src/components/ui/item.tsx`

### ItemTitle — `src/components/ui/item.tsx`

### Kbd — `src/components/ui/kbd.tsx`

### KbdGroup — `src/components/ui/kbd.tsx`

### Label — `src/components/ui/label.tsx`

### Marker — `src/components/ui/marker.tsx`

Props:

- `variant?: "default" | "separator" | "border" | null | undefined`

Variants — `variant`: default, separator, border

### MarkerContent — `src/components/ui/marker.tsx`

### MarkerIcon — `src/components/ui/marker.tsx`

### Menubar — `src/components/ui/menubar.tsx`

### MenubarCheckboxItem — `src/components/ui/menubar.tsx`

Props:

- `inset?: boolean | undefined`

### MenubarContent — `src/components/ui/menubar.tsx`

### MenubarGroup — `src/components/ui/menubar.tsx`

### MenubarItem — `src/components/ui/menubar.tsx`

Props:

- `inset?: boolean | undefined`
- `variant?: "default" | "destructive" | undefined`

### MenubarLabel — `src/components/ui/menubar.tsx`

Props:

- `inset?: boolean | undefined`

### MenubarMenu — `src/components/ui/menubar.tsx`

### MenubarPortal — `src/components/ui/menubar.tsx`

### MenubarRadioGroup — `src/components/ui/menubar.tsx`

### MenubarRadioItem — `src/components/ui/menubar.tsx`

Props:

- `inset?: boolean | undefined`

### MenubarSeparator — `src/components/ui/menubar.tsx`

### MenubarShortcut — `src/components/ui/menubar.tsx`

### MenubarSub — `src/components/ui/menubar.tsx`

### MenubarSubContent — `src/components/ui/menubar.tsx`

### MenubarSubTrigger — `src/components/ui/menubar.tsx`

Props:

- `inset?: boolean | undefined`

### MenubarTrigger — `src/components/ui/menubar.tsx`

### MessageScroller — `src/components/ui/message-scroller.tsx`

### MessageScrollerButton — `src/components/ui/message-scroller.tsx`

Props:

- `label: string`
- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### MessageScrollerContent — `src/components/ui/message-scroller.tsx`

### MessageScrollerItem — `src/components/ui/message-scroller.tsx`

### MessageScrollerProvider — `src/components/ui/message-scroller.tsx`

### MessageScrollerViewport — `src/components/ui/message-scroller.tsx`

### Message — `src/components/ui/message.tsx`

Props:

- `align?: "start" | "end" | undefined`

### MessageAvatar — `src/components/ui/message.tsx`

### MessageContent — `src/components/ui/message.tsx`

### MessageFooter — `src/components/ui/message.tsx`

### MessageGroup — `src/components/ui/message.tsx`

### MessageHeader — `src/components/ui/message.tsx`

### NativeSelect — `src/components/ui/native-select.tsx`

Props:

- `size?: "default" | "sm" | undefined`

### NativeSelectOptGroup — `src/components/ui/native-select.tsx`

### NativeSelectOption — `src/components/ui/native-select.tsx`

### NavigationMenu — `src/components/ui/navigation-menu.tsx`

### NavigationMenuContent — `src/components/ui/navigation-menu.tsx`

### NavigationMenuIndicator — `src/components/ui/navigation-menu.tsx`

### NavigationMenuItem — `src/components/ui/navigation-menu.tsx`

### NavigationMenuLink — `src/components/ui/navigation-menu.tsx`

### NavigationMenuList — `src/components/ui/navigation-menu.tsx`

### NavigationMenuPositioner — `src/components/ui/navigation-menu.tsx`

### NavigationMenuTrigger — `src/components/ui/navigation-menu.tsx`

### Pagination — `src/components/ui/pagination.tsx`

### PaginationContent — `src/components/ui/pagination.tsx`

### PaginationEllipsis — `src/components/ui/pagination.tsx`

### PaginationItem — `src/components/ui/pagination.tsx`

### PaginationLink — `src/components/ui/pagination.tsx`

Props:

- `isActive?: boolean | undefined`
- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`

### PaginationNext — `src/components/ui/pagination.tsx`

Props:

- `isActive?: boolean | undefined`
- `showText?: boolean | undefined`
- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `text: string`

### PaginationPrevious — `src/components/ui/pagination.tsx`

Props:

- `isActive?: boolean | undefined`
- `showText?: boolean | undefined`
- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `text: string`

### Popover — `src/components/ui/popover.tsx`

### PopoverContent — `src/components/ui/popover.tsx`

### PopoverDescription — `src/components/ui/popover.tsx`

### PopoverHeader — `src/components/ui/popover.tsx`

### PopoverTitle — `src/components/ui/popover.tsx`

### PopoverTrigger — `src/components/ui/popover.tsx`

### Progress — `src/components/ui/progress.tsx`

### ProgressIndicator — `src/components/ui/progress.tsx`

### ProgressLabel — `src/components/ui/progress.tsx`

### ProgressTrack — `src/components/ui/progress.tsx`

### ProgressValue — `src/components/ui/progress.tsx`

### RadioGroup — `src/components/ui/radio-group.tsx`

### RadioGroupItem — `src/components/ui/radio-group.tsx`

### ResizableHandle — `src/components/ui/resizable.tsx`

Props:

- `withHandle?: boolean | undefined`

### ResizablePanel — `src/components/ui/resizable.tsx`

### ResizablePanelGroup — `src/components/ui/resizable.tsx`

### ScrollArea — `src/components/ui/scroll-area.tsx`

### ScrollBar — `src/components/ui/scroll-area.tsx`

### Select — `src/components/ui/select.tsx`

### SelectContent — `src/components/ui/select.tsx`

### SelectGroup — `src/components/ui/select.tsx`

### SelectItem — `src/components/ui/select.tsx`

### SelectLabel — `src/components/ui/select.tsx`

### SelectScrollDownButton — `src/components/ui/select.tsx`

### SelectScrollUpButton — `src/components/ui/select.tsx`

### SelectSeparator — `src/components/ui/select.tsx`

### SelectTrigger — `src/components/ui/select.tsx`

Props:

- `size?: "default" | "sm" | undefined`

### SelectValue — `src/components/ui/select.tsx`

### Separator — `src/components/ui/separator.tsx`

### Sheet — `src/components/ui/sheet.tsx`

### SheetClose — `src/components/ui/sheet.tsx`

### SheetContent — `src/components/ui/sheet.tsx`

Props:

- `showCloseButton?: boolean | undefined`
- `side?: "top" | "right" | "bottom" | "left" | undefined`

### SheetDescription — `src/components/ui/sheet.tsx`

### SheetFooter — `src/components/ui/sheet.tsx`

### SheetHeader — `src/components/ui/sheet.tsx`

### SheetTitle — `src/components/ui/sheet.tsx`

### SheetTrigger — `src/components/ui/sheet.tsx`

### Sidebar — `src/components/ui/sidebar.tsx`

Props:

- `collapsible?: "icon" | "none" | "offcanvas" | undefined`
- `side?: "right" | "left" | undefined`
- `variant?: "sidebar" | "floating" | "inset" | undefined`

### SidebarContent — `src/components/ui/sidebar.tsx`

### SidebarFooter — `src/components/ui/sidebar.tsx`

### SidebarGroup — `src/components/ui/sidebar.tsx`

### SidebarGroupAction — `src/components/ui/sidebar.tsx`

### SidebarGroupContent — `src/components/ui/sidebar.tsx`

### SidebarGroupLabel — `src/components/ui/sidebar.tsx`

### SidebarHeader — `src/components/ui/sidebar.tsx`

### SidebarInput — `src/components/ui/sidebar.tsx`

### SidebarInset — `src/components/ui/sidebar.tsx`

### SidebarMenu — `src/components/ui/sidebar.tsx`

### SidebarMenuAction — `src/components/ui/sidebar.tsx`

Props:

- `showOnHover?: boolean | undefined`

### SidebarMenuBadge — `src/components/ui/sidebar.tsx`

### SidebarMenuButton — `src/components/ui/sidebar.tsx`

Props:

- `isActive?: boolean | undefined`
- `size?: "default" | "sm" | "lg" | null | undefined`
- `tooltip?: string | (TooltipPopupProps & Pick<TooltipPositionerProps, "align" | "side" | "sideOffset" | "alignOffset">) | undefined`
- `variant?: "default" | "outline" | null | undefined`

Variants — `variant`: default, outline

Variants — `size`: default, sm, lg

### SidebarMenuItem — `src/components/ui/sidebar.tsx`

### SidebarMenuSkeleton — `src/components/ui/sidebar.tsx`

Props:

- `showIcon?: boolean | undefined`

### SidebarMenuSub — `src/components/ui/sidebar.tsx`

### SidebarMenuSubButton — `src/components/ui/sidebar.tsx`

Props:

- `isActive?: boolean | undefined`
- `size?: "sm" | "md" | undefined`

### SidebarMenuSubItem — `src/components/ui/sidebar.tsx`

### SidebarProvider — `src/components/ui/sidebar.tsx`

Props:

- `defaultOpen?: boolean | undefined`
- `onOpenChange?: ((open: boolean) => void) | undefined`
- `open?: boolean | undefined`

### SidebarRail — `src/components/ui/sidebar.tsx`

### SidebarSeparator — `src/components/ui/sidebar.tsx`

### SidebarTrigger — `src/components/ui/sidebar.tsx`

Props:

- `size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "default" | "link" | "secondary" | "outline" | "ghost" | "destructive" | null | undefined`

### Skeleton — `src/components/ui/skeleton.tsx`

### Slider — `src/components/ui/slider.tsx`

### Toaster — `src/components/ui/sonner.tsx`

### Spinner — `src/components/ui/spinner.tsx`

### Switch — `src/components/ui/switch.tsx`

Props:

- `size?: "default" | "sm" | undefined`

### Table — `src/components/ui/table.tsx`

### TableBody — `src/components/ui/table.tsx`

### TableCaption — `src/components/ui/table.tsx`

### TableCell — `src/components/ui/table.tsx`

### TableFooter — `src/components/ui/table.tsx`

### TableHead — `src/components/ui/table.tsx`

### TableHeader — `src/components/ui/table.tsx`

### TableRow — `src/components/ui/table.tsx`

### Tabs — `src/components/ui/tabs.tsx`

### TabsContent — `src/components/ui/tabs.tsx`

### TabsList — `src/components/ui/tabs.tsx`

Props:

- `variant?: "default" | "line" | null | undefined`

Variants — `variant`: default, line

### TabsTrigger — `src/components/ui/tabs.tsx`

### Textarea — `src/components/ui/textarea.tsx`

### ToggleGroup — `src/components/ui/toggle-group.tsx`

Props:

- `size?: "default" | "sm" | "lg" | null | undefined`
- `spacing?: number | undefined`
- `variant?: "default" | "outline" | null | undefined`

### ToggleGroupItem — `src/components/ui/toggle-group.tsx`

Props:

- `size?: "default" | "sm" | "lg" | null | undefined`
- `variant?: "default" | "outline" | null | undefined`

### Toggle — `src/components/ui/toggle.tsx`

Props:

- `size?: "default" | "sm" | "lg" | null | undefined`
- `variant?: "default" | "outline" | null | undefined`

Variants — `variant`: default, outline

Variants — `size`: default, sm, lg

### Tooltip — `src/components/ui/tooltip.tsx`

### TooltipContent — `src/components/ui/tooltip.tsx`

### TooltipProvider — `src/components/ui/tooltip.tsx`

### TooltipTrigger — `src/components/ui/tooltip.tsx`

### UnreadCountBadge — `src/components/unread-count-badge.tsx`

The single unread-count treatment shared by the header messaging icon and
the messaging dock pill: one deep-red notification badge on the semantic
`destructive` token (never a hardcoded colour), a fixed-diameter round
chip with the count centred in tabular figures so 1- and 2-glyph counts
stay aligned. Renders nothing at zero. Callers pass positioning via
`className` (e.g. the header icon's absolute offset).

Props:

- `count: number`

## Layout compositions

Page, PageHeader, PageContent, and PageSection are the sole canonical page-level composition family for new work. Compose these contracts instead of hand-rolling containers, headings, or rails; use Bleed for full-width bands.

### Page — `src/components/layout/page.tsx`

Establishes the Rhea token scope and shared page width for a route.

Props:

- `children: ReactNode`
- `fill?: boolean | undefined`
- `width?: ContainerWidth | undefined`

Defaults:

- width is `wide` (80rem) with 1rem mobile and 2rem desktop gutters.

Invariants:

- Page owns geometry; callers cannot pass className or style.
- Page publishes `--header-space` — the single header rhythm every
detail surface reads, whether it renders a PageHeader or a full-bleed band.

### PageContent — `src/components/layout/page.tsx`

Owns the page's single main landmark, constrained content column, and
optional named complementary rail.

Props:

- `aside?: ReactNode`
- `asideLabel?: string | undefined`
- `asideOrder?: "before" | "after" | undefined`
- `children: ReactNode`
- `header?: ReactNode`

Defaults:

- asideOrder is `after`; without an aside the body is one column.

Invariants:

- A rendered aside always requires asideLabel and PageContent is the sole main landmark in the Page family.

### PageHeader — `src/components/layout/page.tsx`

Canonical page introduction with one title and optional context, actions,
and search/filter controls.

Props:

- `actions?: ReactNode`
- `align?: "center" | "start" | undefined`
- `children?: ReactNode`
- `description?: ReactNode`
- `eyebrow?: ReactNode`
- `size?: "default" | "display" | undefined`
- `title: ReactNode`

Defaults:

- Start aligned with no optional slots.

Invariants:

- Every PageHeader renders exactly one required h1.

### PageSection — `src/components/layout/page.tsx`

Groups one named region of a page with an optional description and action.

Props:

- `actions?: ReactNode`
- `ariaLabel?: string | undefined`
- `children: ReactNode`
- `description?: ReactNode`
- `eyebrow?: ReactNode`
- `title?: ReactNode`

Defaults:

- Sections use a visible h2 label; ariaLabel is the explicit label-only alternative.

Invariants:

- Exactly one labelling mode is required: title or ariaLabel.

## Patterns

Named page-level compositions documented under `docs/patterns/`.
Select a pattern before composing a route (index + drift notes in
`docs/patterns/README.md`). Every new page starts with the Page family;
pattern frontmatter adds the components inside that anatomy. Generated
from each page’s frontmatter.

### Account shell — `docs/patterns/account-shell.md`

The logged-in surface chassis — an identity rail, section nav, and content region.

Primitives: CandidateAccountShell, CandidateShell, AccountShell, EmployerCompanyShell, Page, PageContent

### Alert capture — `docs/patterns/alert-capture.md`

The email job-alert subscribe surfaces — inline form and floating prompt — over one subscribe contract.

Primitives: AlertSignupForm, JobAlertFloatingPrompt, Card, Field, FieldLabel, FieldDescription, FieldError, InputGroup, ButtonGroup, Button, Spinner

### Auth page — `docs/patterns/auth-page.md`

The centered single-column auth shell — mark, display heading, form, OR divider, social buttons.

Primitives: AuthCard, Field, FieldLabel, Input, FieldError, FieldSeparator, Button, RadioGroup, InputOTP

### Board card — `docs/patterns/board-card.md`

The avatar/logo + title link + meta + pills card surface shared by job, company, talent, post, and salary records.

Primitives: Card, Avatar, Badge, TaxonomyTags, initialsOf

### Breadcrumb — `docs/patterns/breadcrumb.md`

A single bottom-of-page trail that preserves hierarchy without competing with dense page headers.

Primitives: Breadcrumb, ShellBreadcrumb, AriaLink

### Company section — `docs/patterns/company-section.md`

A company's three public surfaces — profile, jobs, salaries — read as ONE entity behind a shared header with tab navigation.

Primitives: Page, PageHeader, PageContent, PageSection, Avatar, Badge, Link

### Detail page — `docs/patterns/detail-page.md`

A canonical single-record page with a page header and decision-complete content, optionally paired with a sticky action rail.

Primitives: Page, Bleed, PageHeader, PageContent, JobDetail, TalentProfileContent, Prose, Avatar, Badge, TaxonomyTags

### Empty state — `docs/patterns/empty-state.md`

The zero-results / not-found treatment — a featured icon, title, and description, kept inside the page chrome.

Primitives: EmptyState, Empty, JobsNotFound, SalaryEmptyState

### Form feedback — `docs/patterns/form-feedback.md`

The success / error / pending message tied to a form action, announced to assistive tech.

Primitives: Alert, AlertDescription, FieldError, FieldDescription, Spinner, toast

### Form page — `docs/patterns/form-page.md`

A page header, titled field sections, a field grid, and a submit with status — the shape of every data-entry surface.

Primitives: Card, Field, FieldSet, FieldLegend, FieldGroup, FieldLabel, FieldDescription, FieldError, Input, Select, Textarea, Checkbox, Button, Alert

### Listing page — `docs/patterns/listing-page.md`

The canonical search/filter → contextual results heading → collection → pagination browse surface.

Primitives: Page, PageContent, JobsFilterControls, SearchResultsLayout, JobsResultsBar, JobList, ListingPagination

### Listing rail — `docs/patterns/listing-rail.md`

The listing surface's operator ad seam plus its crawlable related-searches links, seated around the results column.

Primitives: SearchResultsLayout, AdRail, Badge

### Messaging — `docs/patterns/messaging.md`

A responsive inbox that supports focused full-page conversations and lightweight desktop replies without losing the current page.

Primitives: MessagingLayout, MessagingDock, Message, Bubble, Marker, MessageScroller, Attachment, Avatar, Textarea, Button

### Pending / loading — `docs/patterns/pending-loading.md`

The in-flight treatment for route transitions, master-detail reads, and submitting actions.

Primitives: PublicContentPending, Skeleton, Spinner, Button

### Results header — `docs/patterns/results-header.md`

The contextual results-count H1 and sort control on a single compact row above the results.

Primitives: JobsResultsBar, Select

### Search results — `docs/patterns/search-results.md`

A progressively enhanced directory that keeps dense results and a decision-complete detail visible together on desktop.

Primitives: SearchResultsLayout, SearchResultsList, SearchResultDetail, SearchResultCard, AdRail

### Section heading — `docs/patterns/section-heading.md`

A titled section row with an optional trailing "view all / see all" link.

Primitives: PageSection, Link, Button

### Site header — `docs/patterns/site-header.md`

The public shell's context-aware search, centered discovery navigation, and account actions.

Primitives: Header, HeaderSearch, LocationCombobox, Link, Input, Button, Box

### Stat tile — `docs/patterns/stat-tile.md`

A label + display-value tile for headline metrics and KPI rows.

Primitives: Card, OverallSalaryCard, MetricPanel

### Typography — `docs/patterns/typography.md`

Keep authored interface text on the shadcn/Geist theme scale and rendered HTML in one shadcn Typeset preset.

Primitives: PageHeader, PageSection, CardTitle, Prose

## Do's and Don'ts

- Do style with the token custom properties; don't hardcode colors.
- Do compose Base UI primitives (`render` prop); never Radix
  `asChild`.
- Do keep components presentational (typed props, no fetching);
  data arrives from route loaders and `src/server/` functions.
- Do compose every new page with `Page`, `PageHeader`, `PageContent`,
  and `PageSection`; do not start new work on migration-only
  `PageBody` or `ListingPageHeader`.
- Do reuse the inventory above; don't duplicate an existing
  component to change its style — extend via props/variants.
- Do edit `src/theme.css` directly or with the shadcn CLI and regenerate
  (`pnpm run gen:theme`); don't edit generated files.
- Don't remove or alter the job-detail JSON-LD or `head()` meta.
