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
    fontFamily: "Geist Variable", sans-serif
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

- Sans: `"Geist Variable", sans-serif`
- Headings: `var(--font-sans)`

## Layout

Radius scale rides `--radius` in `src/styles.css` (cards use
`--radius-xl`, controls `--radius-md`). Spacing is Tailwind default
scale; no custom spacing tokens.

## Components

Generated inventory of every exported component under `src/components`.
Select from this inventory before writing anything new.

### AccountShell — `src/components/account-shell.tsx`

Props:

- `active: string`
- `children: ReactNode`
- `identity: ShellIdentity`
- `nav: ShellNavItem[]`
- `rail?: ReactNode`

### CandidateShell — `src/components/account-shell.tsx`

Props:

- `active: string`
- `children: ReactNode`
- `identity?: Partial<ShellIdentity> | undefined`
- `rail?: ReactNode`

### EmployerCompanyShell — `src/components/account-shell.tsx`

Props:

- `active: string`
- `children: ReactNode`
- `company: { name: string; website: string | null; logoUrl: string | null; }`
- `slug: string`

### AlertManager — `src/components/alert-manager.tsx`

Props:

- `alerts: { id: string; object: "alert"; label: string | null; frequency: "daily" | "weekly"; isActive: boolean; filters: { job…`

### MobileNavigationHeader — `src/components/application/app-navigation/base-components/mobile-header.tsx`

### NavAccountCard — `src/components/application/app-navigation/base-components/nav-account-card.tsx`

Props:

- `avatarRounded?: boolean | undefined`
- `items?: NavAccountType[] | undefined`
- `popoverPlacement?: Placement | undefined`
- `selectedAccountId?: string | undefined`

### NavAccountMenu — `src/components/application/app-navigation/base-components/nav-account-card.tsx`

Props:

- `accounts?: NavAccountType[] | undefined`
- `selectedAccountId?: string | undefined`

### NavButton — `src/components/application/app-navigation/base-components/nav-button.tsx`

Props:

- `children?: ReactNode`
- `className?: string | undefined`
- `current?: boolean | undefined`
- `href?: string | undefined`
- `icon?: FC<{ className?: string | undefined; }> | undefined`
- `label?: string | undefined`
- `onClick?: MouseEventHandler | undefined`
- `open?: boolean | undefined`
- `tooltipPlacement?: "bottom" | "top" | "left" | "right" | undefined`

### NavItemBase — `src/components/application/app-navigation/base-components/nav-item.tsx`

Props:

- `badge?: ReactNode`
- `children?: ReactNode`
- `current?: boolean | undefined`
- `href?: string | undefined`
- `icon?: FC<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconOnly?: boolean | undefined`
- `onClick?: MouseEventHandler | undefined`
- `open?: boolean | undefined`
- `truncate?: boolean | undefined`
- `type: "link" | "collapsible" | "collapsible-child"`

### NavList — `src/components/application/app-navigation/base-components/nav-list.tsx`

Props:

- `activeUrl?: string | undefined`
- `className?: string | undefined`
- `items: (NavItemType | NavItemDividerType)[]`

### HeaderNavigationBase — `src/components/application/app-navigation/header-navigation.tsx`

Props:

- `actions?: ReactNode`
- `activeUrl?: string | undefined`
- `centered?: boolean | undefined`
- `hideBorder?: boolean | undefined`
- `items: NavItem[]`
- `secondaryType?: "buttons" | "tabs" | undefined`
- `subItems?: NavItem[] | undefined`

### MobileNavigationHeader — `src/components/application/app-navigation/sidebar-navigation-base.tsx`

### NavAccountCard — `src/components/application/app-navigation/sidebar-navigation-base.tsx`

Props:

- `avatarRounded?: boolean | undefined`
- `items?: NavAccountType[] | undefined`
- `popoverPlacement?: Placement | undefined`
- `selectedAccountId?: string | undefined`

### NavButton — `src/components/application/app-navigation/sidebar-navigation-base.tsx`

Props:

- `children?: ReactNode`
- `className?: string | undefined`
- `current?: boolean | undefined`
- `href?: string | undefined`
- `icon?: FC<{ className?: string | undefined; }> | undefined`
- `label?: string | undefined`
- `onClick?: MouseEventHandler | undefined`
- `open?: boolean | undefined`
- `tooltipPlacement?: "bottom" | "top" | "left" | "right" | undefined`

### NavItemBase — `src/components/application/app-navigation/sidebar-navigation-base.tsx`

Props:

- `badge?: ReactNode`
- `children?: ReactNode`
- `current?: boolean | undefined`
- `href?: string | undefined`
- `icon?: FC<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconOnly?: boolean | undefined`
- `onClick?: MouseEventHandler | undefined`
- `open?: boolean | undefined`
- `truncate?: boolean | undefined`
- `type: "link" | "collapsible" | "collapsible-child"`

### NavList — `src/components/application/app-navigation/sidebar-navigation-base.tsx`

Props:

- `activeUrl?: string | undefined`
- `className?: string | undefined`
- `items: (NavItemType | NavItemDividerType)[]`

### SidebarNavigationDualTier — `src/components/application/app-navigation/sidebar-navigation/sidebar-dual-tier.tsx`

Props:

- `accountItems?: NavAccountType[] | undefined`
- `activeUrl?: string | undefined`
- `featureCard?: ReactNode`
- `footerItems?: NavItemType[] | undefined`
- `hideBorder?: boolean | undefined`
- `items: NavItemType[]`
- `selectedAccountId?: string | undefined`

### SidebarNavigationSectionDividers — `src/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers.tsx`

Props:

- `activeUrl?: string | undefined`
- `items: (NavItemType | NavItemDividerType)[]`

### SidebarNavigationSectionsSubheadings — `src/components/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings.tsx`

Props:

- `activeUrl?: string | undefined`
- `items: { label: string; items: NavItemType[]; }[]`

### SidebarNavigationSimple — `src/components/application/app-navigation/sidebar-navigation/sidebar-simple.tsx`

Props:

- `activeUrl?: string | undefined`
- `avatarRounded?: boolean | undefined`
- `className?: string | undefined`
- `featureCard?: ReactNode`
- `footerItems?: NavItemType[] | undefined`
- `hideBorder?: boolean | undefined`
- `items: NavItemType[]`
- `showAccountCard?: boolean | undefined`

### SidebarNavigationSlim — `src/components/application/app-navigation/sidebar-navigation/sidebar-slim.tsx`

Props:

- `activeUrl?: string | undefined`
- `footerItems?: (NavItemType & { icon: FC<{ className?: string | undefined; }>; })[] | undefined`
- `hideBorder?: boolean | undefined`
- `hideRightBorder?: boolean | undefined`
- `items: (NavItemType & { icon: FC<{ className?: string | undefined; }>; })[]`

### CarouselContext — `src/components/application/carousel/carousel-base.tsx`

### ChartActiveDot — `src/components/application/charts/charts-base.tsx`

Props:

- `payload?: any`

### ChartLegendContent — `src/components/application/charts/charts-base.tsx`

Props:

- `className?: string | undefined`
- `reversed?: boolean | undefined`

### ChartTooltipContent — `src/components/application/charts/charts-base.tsx`

Props:

- `isPieChart?: boolean | undefined`
- `isRadialChart?: boolean | undefined`
- `label?: string | undefined`
- `payload?: any`

### Calendar — `src/components/application/date-picker/calendar.tsx`

Props:

- `children?: ReactNode`
- `highlightedDates?: DateValue[] | undefined`

### CalendarContextProvider — `src/components/application/date-picker/calendar.tsx`

### CalendarCell — `src/components/application/date-picker/cell.tsx`

Props:

- `isHighlighted?: boolean | undefined`
- `isRangeCalendar?: boolean | undefined`
- `showOutOfRangeDates?: boolean | undefined`

### DatePicker — `src/components/application/date-picker/date-picker.tsx`

Props:

- `onApply?: (() => void) | undefined`
- `onCancel?: (() => void) | undefined`
- `size?: "xs" | "sm" | "md" | "lg" | "xl" | undefined`

### DateRangePicker — `src/components/application/date-picker/date-range-picker.tsx`

Props:

- `onApply?: (() => void) | undefined`
- `onCancel?: (() => void) | undefined`
- `size?: "xs" | "sm" | "md" | "lg" | "xl" | undefined`

### RangeCalendar — `src/components/application/date-picker/range-calendar.tsx`

Props:

- `highlightedDates?: DateValue[] | undefined`
- `presets?: Record<string, { label: string; value: { start: DateValue; end: DateValue; }; }> | undefined`
- `showOutOfRangeDates?: boolean | undefined`
- `showPresetsOnDesktop?: boolean | undefined`

### RangeCalendarContextProvider — `src/components/application/date-picker/range-calendar.tsx`

### RangePresetButton — `src/components/application/date-picker/range-calendar.tsx`

Props:

- `value: { start: DateValue; end: DateValue; }`

### EmptyState — `src/components/application/empty-state/empty-state.tsx`

Props:

- `size?: "sm" | "md" | "lg" | undefined`

### Draggable — `src/components/application/file-upload/draggable.tsx`

Props:

- `fileIconType?: FileType | undefined`
- `name: string`
- `size: number`
- `theme?: "default" | "gray" | "solid" | undefined`
- `type: string`

### FileListItemProgressBar — `src/components/application/file-upload/file-upload-base.tsx`

Props:

- `className?: string | undefined`
- `failed?: boolean | undefined`
- `fileIconVariant?: "default" | "gray" | "solid" | undefined`
- `name: string`
- `onDelete?: (() => void) | undefined`
- `onRetry?: (() => void) | undefined`
- `progress: number`
- `size: number`
- `type?: FileType | undefined`

### FileListItemProgressFill — `src/components/application/file-upload/file-upload-base.tsx`

Props:

- `className?: string | undefined`
- `failed?: boolean | undefined`
- `fileIconVariant?: "default" | "gray" | "solid" | undefined`
- `name: string`
- `onDelete?: (() => void) | undefined`
- `onRetry?: (() => void) | undefined`
- `progress: number`
- `size: number`
- `type?: FileType | undefined`

### FileUploadDropZone — `src/components/application/file-upload/file-upload-base.tsx`

Props:

- `accept?: string | undefined`
- `allowsMultiple?: boolean | undefined`
- `className?: string | undefined`
- `hint?: string | undefined`
- `isDisabled?: boolean | undefined`
- `maxSize?: number | undefined`
- `onDropFiles?: ((files: FileList) => void) | undefined`
- `onDropUnacceptedFiles?: ((files: FileList) => void) | undefined`
- `onSizeLimitExceed?: ((files: FileList) => void) | undefined`

### LoadingIndicator — `src/components/application/loading-indicator/loading-indicator.tsx`

Props:

- `label?: string | undefined`
- `size?: "sm" | "md" | "lg" | "xl" | undefined`
- `type?: "line-simple" | "line-spinner" | "dot-circle" | undefined`

### Dialog — `src/components/application/modals/modal.tsx`

### DialogTrigger — `src/components/application/modals/modal.tsx`

### Modal — `src/components/application/modals/modal.tsx`

### ModalOverlay — `src/components/application/modals/modal.tsx`

### PaginationDot — `src/components/application/pagination/pagination-dot.tsx`

Props:

- `className?: string | undefined`
- `framed?: boolean | undefined`
- `isBrand?: boolean | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page: number`
- `siblingCount?: number | undefined`
- `size?: "md" | "lg" | undefined`
- `style?: CSSProperties | undefined`
- `total: number`

### PaginationLine — `src/components/application/pagination/pagination-line.tsx`

Props:

- `className?: string | undefined`
- `framed?: boolean | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page: number`
- `siblingCount?: number | undefined`
- `size?: "md" | "lg" | undefined`
- `style?: CSSProperties | undefined`
- `total: number`

### PaginationButtonGroup — `src/components/application/pagination/pagination.tsx`

Props:

- `align?: "left" | "right" | "center" | undefined`
- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page?: number | undefined`
- `siblingCount?: number | undefined`
- `style?: CSSProperties | undefined`
- `total?: number | undefined`

### PaginationCardAdvanced — `src/components/application/pagination/pagination.tsx`

Props:

- `align?: "center" | "space-between" | undefined`
- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `onPageSizeChange?: ((pageSize: number) => void) | undefined`
- `page?: number | undefined`
- `pageSize?: number | undefined`
- `total?: number | undefined`

### PaginationCardDefault — `src/components/application/pagination/pagination.tsx`

Props:

- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page?: number | undefined`
- `rounded?: boolean | undefined`
- `siblingCount?: number | undefined`
- `style?: CSSProperties | undefined`
- `total?: number | undefined`

### PaginationCardMinimal — `src/components/application/pagination/pagination.tsx`

Props:

- `align?: "left" | "right" | "center" | undefined`
- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `onPageSizeChange?: ((pageSize: number) => void) | undefined`
- `page?: number | undefined`
- `pageSize?: number | undefined`
- `total?: number | undefined`

### PaginationPageDefault — `src/components/application/pagination/pagination.tsx`

Props:

- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page?: number | undefined`
- `rounded?: boolean | undefined`
- `siblingCount?: number | undefined`
- `style?: CSSProperties | undefined`
- `total?: number | undefined`

### PaginationPageMinimalCenter — `src/components/application/pagination/pagination.tsx`

Props:

- `className?: string | undefined`
- `onPageChange?: ((page: number) => void) | undefined`
- `page?: number | undefined`
- `rounded?: boolean | undefined`
- `siblingCount?: number | undefined`
- `style?: CSSProperties | undefined`
- `total?: number | undefined`

### Dialog — `src/components/application/slideout-menus/slideout-menu.tsx`

### Modal — `src/components/application/slideout-menus/slideout-menu.tsx`

### ModalOverlay — `src/components/application/slideout-menus/slideout-menu.tsx`

### SlideoutMenu — `src/components/application/slideout-menus/slideout-menu.tsx`

Props:

- `children: ReactNode | ((children: ModalRenderProps & { close: () => void; }) => ReactNode)`
- `dialogClassName?: string | undefined`

### Table — `src/components/application/table/table.tsx`

Props:

- `size?: "sm" | "md" | undefined`

### TableRowActionsDropdown — `src/components/application/table/table.tsx`

### Tab — `src/components/application/tabs/tabs.tsx`

Props:

- `badge?: string | number | undefined`
- `children?: ReactNode | ((props: TabRenderProps) => ReactNode)`
- `icon?: ReactNode | FC<{ className?: string | undefined; }>`
- `label?: ReactNode`

### TabList — `src/components/application/tabs/tabs.tsx`

Props:

- `fullWidth?: boolean | undefined`
- `items?: TabComponentProps[] | undefined`
- `orientation?: T | undefined`
- `size?: "sm" | "md" | undefined`
- `type?: TabTypeColors<T> | undefined`

### TabPanel — `src/components/application/tabs/tabs.tsx`

### Tabs — `src/components/application/tabs/tabs.tsx`

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
- `minLength?: number | undefined`
- `name: string`
- `type?: string | undefined`

### FormError — `src/components/auth-form.tsx`

Props:

- `message: string | null`

### AvatarUpload — `src/components/avatar-upload.tsx`

Props:

- `avatarUrl: string | null`
- `displayName: string | null`

### AvatarLabelGroup — `src/components/base/avatar/avatar-label-group.tsx`

Props:

- `alt?: string | undefined`
- `avatarClassName?: string | undefined`
- `badge?: ReactNode`
- `border?: boolean | undefined`
- `className?: string | undefined`
- `contentClassName?: string | undefined`
- `contrastBorder?: boolean | undefined`
- `count?: number | undefined`
- `focusable?: boolean | undefined`
- `initials?: string | undefined`
- `placeholder?: ReactNode`
- `placeholderIcon?: FC<{ className?: string | undefined; }> | undefined`
- `rounded?: boolean | undefined`
- `size: "sm" | "md" | "lg"`
- `src?: string | null | undefined`
- `status?: "online" | "offline" | undefined`
- `subtitle: ReactNode`
- `title: ReactNode`
- `verified?: boolean | undefined`

### AvatarProfilePhoto — `src/components/base/avatar/avatar-profile-photo.tsx`

Props:

- `alt?: string | undefined`
- `badge?: ReactNode`
- `border?: boolean | undefined`
- `className?: string | undefined`
- `contentClassName?: string | undefined`
- `contrastBorder?: boolean | undefined`
- `count?: number | undefined`
- `focusable?: boolean | undefined`
- `initials?: string | undefined`
- `placeholder?: ReactNode`
- `placeholderIcon?: FC<{ className?: string | undefined; }> | undefined`
- `rounded?: boolean | undefined`
- `size: "sm" | "md" | "lg"`
- `src?: string | null | undefined`
- `status?: "online" | "offline" | undefined`
- `verified?: boolean | undefined`

### Avatar — `src/components/base/avatar/avatar.tsx`

Props:

- `alt?: string | undefined`
- `badge?: ReactNode`
- `border?: boolean | undefined`
- `className?: string | undefined`
- `contentClassName?: string | undefined`
- `contrastBorder?: boolean | undefined`
- `count?: number | undefined`
- `focusable?: boolean | undefined`
- `initials?: string | undefined`
- `placeholder?: ReactNode`
- `placeholderIcon?: FC<{ className?: string | undefined; }> | undefined`
- `rounded?: boolean | undefined`
- `size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | undefined`
- `src?: string | null | undefined`
- `status?: "online" | "offline" | undefined`
- `verified?: boolean | undefined`

### AvatarAddButton — `src/components/base/avatar/base-components/avatar-add-button.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md"`
- `title?: string | undefined`

### AvatarCompanyIcon — `src/components/base/avatar/base-components/avatar-company-icon.tsx`

Props:

- `alt?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"`
- `src: string`

### AvatarCount — `src/components/base/avatar/base-components/avatar-count.tsx`

Props:

- `className?: string | undefined`
- `count: number`

### AvatarOnlineIndicator — `src/components/base/avatar/base-components/avatar-online-indicator.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"`
- `status: "online" | "offline"`

### AvatarAddButton — `src/components/base/avatar/base-components/index.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md"`
- `title?: string | undefined`

### AvatarCompanyIcon — `src/components/base/avatar/base-components/index.tsx`

Props:

- `alt?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"`
- `src: string`

### AvatarOnlineIndicator — `src/components/base/avatar/base-components/index.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"`
- `status: "online" | "offline"`

### VerifiedTick — `src/components/base/avatar/base-components/index.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"`

### VerifiedTick — `src/components/base/avatar/base-components/verified-tick.tsx`

Props:

- `className?: string | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"`

### BadgeGroup — `src/components/base/badges/badge-groups.tsx`

Props:

- `addonText: string`
- `align?: Align | undefined`
- `children?: ReactNode`
- `className?: string | undefined`
- `color: Color`
- `iconTrailing?: ReactNode | FC<{ className?: string | undefined; }>`
- `size?: Size | undefined`
- `theme?: Theme | undefined`

### Badge — `src/components/base/badges/badges.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `color?: BadgeColor<T> | undefined`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeIcon — `src/components/base/badges/badges.tsx`

Props:

- `children?: ReactNode`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `icon: IconComponentType`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeWithButton — `src/components/base/badges/badges.tsx`

Props:

- `buttonLabel?: string | undefined`
- `children: ReactNode`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `icon?: IconComponentType | undefined`
- `onButtonClick?: MouseEventHandler<HTMLButtonElement> | undefined`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeWithDot — `src/components/base/badges/badges.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeWithFlag — `src/components/base/badges/badges.tsx`

Props:

- `children: ReactNode`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `flag?: FlagTypes | undefined`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeWithIcon — `src/components/base/badges/badges.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `iconLeading?: IconComponentType | undefined`
- `iconTrailing?: IconComponentType | undefined`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### BadgeWithImage — `src/components/base/badges/badges.tsx`

Props:

- `children: ReactNode`
- `color?: BadgeTypeToColorMap<{ "pill-color": { common: string; styles: Record<BadgeColors, { root: string; addon: string; addo…`
- `imgSrc: string`
- `size?: Sizes | undefined`
- `type?: T | undefined`

### ButtonGroup — `src/components/base/button-group/button-group.tsx`

Props:

- `className?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### ButtonGroupItem — `src/components/base/button-group/button-group.tsx`

Props:

- `className?: string | undefined`
- `iconLeading?: ReactNode | FC<{ className?: string | undefined; }>`
- `iconTrailing?: ReactNode | FC<{ className?: string | undefined; }>`
- `onClick?: (() => void) | undefined`

### AppGalleryButton — `src/components/base/buttons/app-store-buttons-outline.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### AppStoreButton — `src/components/base/buttons/app-store-buttons-outline.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### GalaxyStoreButton — `src/components/base/buttons/app-store-buttons-outline.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### GooglePlayButton — `src/components/base/buttons/app-store-buttons-outline.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### AppGalleryButton — `src/components/base/buttons/app-store-buttons.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### AppStoreButton — `src/components/base/buttons/app-store-buttons.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### GalaxyStoreButton — `src/components/base/buttons/app-store-buttons.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### GooglePlayButton — `src/components/base/buttons/app-store-buttons.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### GooglePlayWhiteButton — `src/components/base/buttons/app-store-buttons.tsx`

Props:

- `size?: "md" | "lg" | undefined`

### ButtonUtility — `src/components/base/buttons/button-utility.tsx`

Props:

- `color?: "secondary" | "tertiary" | undefined`
- `icon?: ReactNode | FC<{ className?: string | undefined; }>`
- `isDisabled?: boolean | undefined`
- `size?: "xs" | "sm" | undefined`
- `slot?: string | null | undefined`
- `tooltip?: string | undefined`
- `tooltipPlacement?: Placement | undefined`

### Button — `src/components/base/buttons/button.tsx`

Props:

- `children?: ReactNode`
- `className?: string | undefined`
- `color?: "primary" | "secondary" | "tertiary" | "link-color" | "link-gray" | "primary-destructive" | "secondary-destructive" |…`
- `href: string`
- `iconLeading?: ReactNode | FC<{ className?: string | undefined; }>`
- `iconTrailing?: ReactNode | FC<{ className?: string | undefined; }>`
- `isDisabled?: boolean | undefined`
- `isLoading?: boolean | undefined`
- `noTextPadding?: boolean | undefined`
- `showTextWhileLoading?: boolean | undefined`
- `size?: "xs" | "sm" | "md" | "lg" | "xl" | undefined`

### CloseButton — `src/components/base/buttons/close-button.tsx`

Props:

- `label?: string | undefined`
- `size?: "xs" | "sm" | "md" | "lg" | undefined`
- `slot?: string | null | undefined`
- `theme?: "light" | "dark" | undefined`

### SocialButton — `src/components/base/buttons/social-button.tsx`

Props:

- `disabled?: boolean | undefined`
- `size?: "md" | "lg" | undefined`
- `slot?: string | null | undefined`
- `social: "facebook" | "dribble" | "google" | "apple" | "twitter" | "figma"`
- `theme?: "color" | "gray" | "brand" | undefined`

### AppleLogo — `src/components/base/buttons/social-logos.tsx`

### DribbleLogo — `src/components/base/buttons/social-logos.tsx`

Props:

- `colorful?: boolean | undefined`

### FacebookLogo — `src/components/base/buttons/social-logos.tsx`

Props:

- `colorful?: boolean | undefined`

### FigmaLogo — `src/components/base/buttons/social-logos.tsx`

Props:

- `colorful?: boolean | undefined`

### FigmaLogoOutlined — `src/components/base/buttons/social-logos.tsx`

### GoogleLogo — `src/components/base/buttons/social-logos.tsx`

Props:

- `colorful?: boolean | undefined`

### TwitterLogo — `src/components/base/buttons/social-logos.tsx`

### Checkbox — `src/components/base/checkbox/checkbox.tsx`

Props:

- `hint?: ReactNode`
- `label?: ReactNode`
- `ref?: Ref<HTMLLabelElement> | undefined`
- `size?: "sm" | "md" | undefined`

### CheckboxBase — `src/components/base/checkbox/checkbox.tsx`

Props:

- `className?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isFocusVisible?: boolean | undefined`
- `isIndeterminate?: boolean | undefined`
- `isSelected?: boolean | undefined`
- `size?: "sm" | "md" | undefined`

### DropdownAccountBreadcrumb — `src/components/base/dropdown/dropdown-account-breadcrumb.tsx`

### DropdownAccountButton — `src/components/base/dropdown/dropdown-account-button.tsx`

### DropdownAccountCardMD — `src/components/base/dropdown/dropdown-account-card-md.tsx`

### DropdownAccountCardSM — `src/components/base/dropdown/dropdown-account-card-sm.tsx`

### DropdownAccountCardXS — `src/components/base/dropdown/dropdown-account-card-xs.tsx`

### DropdownAvatar — `src/components/base/dropdown/dropdown-avatar.tsx`

### DropdownButtonAdvanced — `src/components/base/dropdown/dropdown-button-advanced.tsx`

### DropdownButtonLink — `src/components/base/dropdown/dropdown-button-link.tsx`

### DropdownButtonSimple — `src/components/base/dropdown/dropdown-button-simple.tsx`

### DropdownIconAdvanced — `src/components/base/dropdown/dropdown-icon-advanced.tsx`

### DropdownIconSimple — `src/components/base/dropdown/dropdown-icon-simple.tsx`

### DropdownIntegration — `src/components/base/dropdown/dropdown-integration.tsx`

### DropdownSearchAdvanced — `src/components/base/dropdown/dropdown-search-advanced.tsx`

### DropdownSearchSimple — `src/components/base/dropdown/dropdown-search-simple.tsx`

### FileTrigger — `src/components/base/file-upload-trigger/file-upload-trigger.tsx`

Props:

- `acceptDirectory?: boolean | undefined`
- `acceptedFileTypes?: string[] | undefined`
- `allowsMultiple?: boolean | undefined`
- `children: ReactNode`
- `defaultCamera?: "user" | "environment" | undefined`
- `onSelect?: ((files: FileList | null) => void) | undefined`

### Form — `src/components/base/form/form.tsx`

### FormField — `src/components/base/form/hook-form.tsx`

Props:

- `children: ReactNode | ((control: UseControllerReturn<TFieldValues, TName>) => ReactNode)`
- `control: Control<TFieldValues>`
- `name: TName`

### HookForm — `src/components/base/form/hook-form.tsx`

Props:

- `children: ReactNode`
- `form: UseFormReturn<TFieldValues>`

### HintText — `src/components/base/input/hint-text.tsx`

Props:

- `children: ReactNode`
- `isInvalid?: boolean | undefined`
- `ref?: Ref<HTMLElement> | undefined`
- `size?: "sm" | "md" | undefined`

### InputDate — `src/components/base/input/input-date.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `label?: string | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `shortcut?: string | boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### InputDateBase — `src/components/base/input/input-date.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconClassName?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `shortcut?: string | boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### InputFile — `src/components/base/input/input-file.tsx`

Props:

- `acceptedFileTypes?: string[] | undefined`
- `allowsMultiple?: boolean | undefined`
- `buttonText?: string | undefined`
- `className?: string | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `isLoading?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `label?: string | undefined`
- `onChange?: ((files: FileList | null) => void) | undefined`
- `placeholder?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### InputGroup — `src/components/base/input/input-group.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `label?: string | undefined`
- `leadingAddon?: ReactNode`
- `prefix?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltipClassName?: string | undefined`
- `trailingAddon?: ReactNode`
- `wrapperClassName?: string | undefined`

### InputPrefix — `src/components/base/input/input-group.tsx`

Props:

- `isDisabled?: boolean | undefined`
- `position?: "leading" | "trailing" | undefined`

### InputNumber — `src/components/base/input/input-number.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `inputClassName?: string | undefined`
- `label?: string | undefined`
- `orientation?: "horizontal" | "vertical" | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `wrapperClassName?: string | undefined`

### InputNumberBase — `src/components/base/input/input-number.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `inputClassName?: string | undefined`
- `orientation?: "horizontal" | "vertical" | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `wrapperClassName?: string | undefined`

### PaymentInput — `src/components/base/input/input-payment.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `label?: string | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `shortcut?: string | boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### InputTagsOuter — `src/components/base/input/input-tags-outer.tsx`

Props:

- `allowDuplicates?: boolean | undefined`
- `className?: string | undefined`
- `defaultValue?: string[] | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `label?: string | undefined`
- `maxTags?: number | undefined`
- `onChange?: ((tags: string[]) => void) | undefined`
- `onTagAdded?: ((tag: string) => void) | undefined`
- `onTagRemoved?: ((tag: string) => void) | undefined`
- `placeholder?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `validate?: ((value: string) => boolean) | undefined`
- `value?: string[] | undefined`

### InputTags — `src/components/base/input/input-tags.tsx`

Props:

- `allowDuplicates?: boolean | undefined`
- `className?: string | undefined`
- `defaultValue?: string[] | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `label?: string | undefined`
- `maxTags?: number | undefined`
- `onChange?: ((tags: string[]) => void) | undefined`
- `onTagAdded?: ((tag: string) => void) | undefined`
- `onTagRemoved?: ((tag: string) => void) | undefined`
- `placeholder?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `validate?: ((value: string) => boolean) | undefined`
- `value?: string[] | undefined`

### Input — `src/components/base/input/input.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `label?: string | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `shortcut?: string | boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### InputBase — `src/components/base/input/input.tsx`

Props:

- `groupRef?: Ref<HTMLDivElement> | undefined`
- `icon?: ComponentType<HTMLAttributes<HTMLOrSVGElement>> | undefined`
- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLInputElement> | undefined`
- `shortcut?: string | boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### TextField — `src/components/base/input/input.tsx`

Props:

- `iconClassName?: string | undefined`
- `inputClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltipClassName?: string | undefined`
- `wrapperClassName?: string | undefined`

### Label — `src/components/base/input/label.tsx`

Props:

- `children: ReactNode`
- `isInvalid?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `ref?: Ref<HTMLLabelElement> | undefined`
- `tooltip?: string | undefined`
- `tooltipDescription?: string | undefined`

### PinInput — `src/components/base/input/pin-input.tsx`

Props:

- `disabled?: boolean | undefined`
- `invalid?: boolean | undefined`
- `size?: PinInputSize | undefined`

### ProgressBarCircle — `src/components/base/progress-indicators/progress-circles.tsx`

Props:

- `label?: string | undefined`
- `max?: number | undefined`
- `min?: number | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xxs"`
- `value: number`
- `valueFormatter?: ((value: number, valueInPercentage: number) => string | number) | undefined`

### ProgressBarHalfCircle — `src/components/base/progress-indicators/progress-circles.tsx`

Props:

- `label?: string | undefined`
- `max?: number | undefined`
- `min?: number | undefined`
- `size: "xs" | "sm" | "md" | "lg" | "xxs"`
- `value: number`
- `valueFormatter?: ((value: number, valueInPercentage: number) => string | number) | undefined`

### ProgressBar — `src/components/base/progress-indicators/progress-indicators.tsx`

Props:

- `className?: string | undefined`
- `labelPosition?: ProgressBarLabelPosition | undefined`
- `max?: number | undefined`
- `min?: number | undefined`
- `progressClassName?: string | undefined`
- `value: number`
- `valueFormatter?: ((value: number, valueInPercentage: number) => string | number) | undefined`

### ProgressBarBase — `src/components/base/progress-indicators/progress-indicators.tsx`

Props:

- `className?: string | undefined`
- `max?: number | undefined`
- `min?: number | undefined`
- `progressClassName?: string | undefined`
- `value: number`
- `valueFormatter?: ((value: number, valueInPercentage: number) => string | number) | undefined`

### CircleProgressBar — `src/components/base/progress-indicators/simple-circle.tsx`

Props:

- `max?: 100 | undefined`
- `min?: 0 | undefined`
- `value: number`

### RadioButton — `src/components/base/radio-buttons/radio-buttons.tsx`

Props:

- `hint?: ReactNode`
- `label?: ReactNode`
- `ref?: Ref<HTMLLabelElement> | undefined`
- `size?: "sm" | "md" | undefined`

### RadioButtonBase — `src/components/base/radio-buttons/radio-buttons.tsx`

Props:

- `className?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isFocusVisible?: boolean | undefined`
- `isSelected?: boolean | undefined`
- `size?: "sm" | "md" | undefined`

### RadioGroup — `src/components/base/radio-buttons/radio-buttons.tsx`

Props:

- `children: ReactNode`
- `className?: string | undefined`
- `size?: "sm" | "md" | undefined`

### ComboBox — `src/components/base/select/combobox.tsx`

Props:

- `children: ReactNode | ((item: SelectItemType) => ReactNode)`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: string | undefined`
- `icon?: ReactNode | FC`
- `items?: SelectItemType[] | undefined`
- `label?: string | undefined`
- `placeholder?: string | undefined`
- `popoverClassName?: string | undefined`
- `shortcut?: boolean | undefined`
- `shortcutClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`

### MultiSelect — `src/components/base/select/multi-select.tsx`

Props:

- `children: ReactNode | ((item: SelectItemType) => ReactNode)`
- `className?: string | undefined`
- `defaultSelectedKeys?: Selection | undefined`
- `emptyStateDescription?: string | undefined`
- `emptyStateTitle?: string | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isInvalid?: boolean | undefined`
- `isRequired?: boolean | undefined`
- `items?: SelectItemType[] | undefined`
- `label?: string | undefined`
- `onReset?: (() => void) | undefined`
- `onSelectAll?: (() => void) | undefined`
- `onSelectionChange?: ((keys: Selection) => void) | undefined`
- `placeholder?: string | undefined`
- `popoverClassName?: string | undefined`
- `selectedCountFormatter?: ((count: number) => ReactNode) | undefined`
- `selectedKeys?: Selection | undefined`
- `showFooter?: boolean | undefined`
- `showSearch?: boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `supportingText?: ReactNode`
- `tooltip?: string | undefined`

### Popover — `src/components/base/select/popover.tsx`

Props:

- `size: "sm" | "md" | "lg"`

### SelectItem — `src/components/base/select/select-item.tsx`

Props:

- `avatarUrl?: string | undefined`
- `icon?: ReactNode | FC`
- `id: string | number`
- `label?: string | undefined`
- `selectionIndicator?: "none" | "checkbox" | "checkmark" | undefined`
- `selectionIndicatorAlign?: "left" | "right" | undefined`
- `supportingText?: string | undefined`

### NativeSelect — `src/components/base/select/select-native.tsx`

Props:

- `hint?: string | undefined`
- `label?: string | undefined`
- `options: { label: string; value: string; disabled?: boolean | undefined; }[]`
- `selectClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### SelectContext — `src/components/base/select/select-shared.tsx`

### Select — `src/components/base/select/select.tsx`

Props:

- `children: ReactNode | ((item: SelectItemType) => ReactNode)`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: string | undefined`
- `icon?: ReactNode | FC`
- `items?: SelectItemType[] | undefined`
- `label?: string | undefined`
- `popoverClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`

### SelectContext — `src/components/base/select/select.tsx`

### TagSelect — `src/components/base/select/tag-select.tsx`

Props:

- `children: ReactNode | ((item: SelectItemType) => ReactNode)`
- `hint?: string | undefined`
- `icon?: IconComponentType | null | undefined`
- `items?: SelectItemType[] | undefined`
- `label?: string | undefined`
- `onItemCleared?: ((key: Key) => void) | undefined`
- `onItemInserted?: ((key: Key) => void) | undefined`
- `placeholder?: string | undefined`
- `popoverClassName?: string | undefined`
- `selectedItems: ListData<SelectItemType>`
- `shortcut?: boolean | undefined`
- `shortcutClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `valueFormatter?: ((item: SelectItemType) => string) | undefined`

### TagSelectBase — `src/components/base/select/tag-select.tsx`

Props:

- `children: ReactNode | ((item: SelectItemType) => ReactNode)`
- `hint?: string | undefined`
- `icon?: IconComponentType | null | undefined`
- `items?: SelectItemType[] | undefined`
- `label?: string | undefined`
- `onItemCleared?: ((key: Key) => void) | undefined`
- `onItemInserted?: ((key: Key) => void) | undefined`
- `placeholder?: string | undefined`
- `popoverClassName?: string | undefined`
- `selectedItems: ListData<SelectItemType>`
- `shortcut?: boolean | undefined`
- `shortcutClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `tooltip?: string | undefined`
- `valueFormatter?: ((item: SelectItemType) => string) | undefined`

### TagSelectTagsValue — `src/components/base/select/tag-select.tsx`

Props:

- `icon?: IconComponentType | null | undefined`
- `isDisabled?: boolean | undefined`
- `onFocus?: FocusEventHandler | undefined`
- `onPointerEnter?: PointerEventHandler | undefined`
- `placeholder?: string | undefined`
- `ref?: RefObject<HTMLDivElement | null> | undefined`
- `shortcut?: boolean | undefined`
- `shortcutClassName?: string | undefined`
- `size: "sm" | "md" | "lg"`

### Slider — `src/components/base/slider/slider.tsx`

Props:

- `labelFormatter?: ((value: number) => string) | undefined`
- `labelPosition?: "bottom" | "default" | "top-floating" | undefined`

### TagCheckbox — `src/components/base/tags/base-components/tag-checkbox.tsx`

Props:

- `className?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isFocused?: boolean | undefined`
- `isSelected?: boolean | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### TagCloseX — `src/components/base/tags/base-components/tag-close-x.tsx`

Props:

- `className?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### Tag — `src/components/base/tags/tags.tsx`

Props:

- `avatarContrastBorder?: boolean | undefined`
- `avatarSrc?: string | undefined`
- `count?: number | undefined`
- `dot?: boolean | undefined`
- `dotClassName?: string | undefined`
- `onClose?: ((id: string) => void) | undefined`

### TagAvatar — `src/components/base/tags/tags.tsx`

Props:

- `contrastBorder?: boolean | undefined`

### TagGroup — `src/components/base/tags/tags.tsx`

Props:

- `label: string`
- `size?: "sm" | "md" | "lg" | undefined`

### TagList — `src/components/base/tags/tags.tsx`

### TextArea — `src/components/base/textarea/textarea.tsx`

Props:

- `cols?: number | undefined`
- `hideRequiredIndicator?: boolean | undefined`
- `hint?: ReactNode`
- `label?: string | undefined`
- `placeholder?: string | undefined`
- `ref?: Ref<HTMLDivElement> | undefined`
- `rows?: number | undefined`
- `size?: "sm" | "md" | undefined`
- `textAreaClassName?: ClassNameOrFunction<InputRenderProps> | undefined`
- `textAreaRef?: Ref<HTMLTextAreaElement> | undefined`
- `tooltip?: string | undefined`

### TextAreaBase — `src/components/base/textarea/textarea.tsx`

Props:

- `ref?: Ref<HTMLTextAreaElement> | undefined`
- `size?: "sm" | "md" | undefined`

### Toggle — `src/components/base/toggle/toggle.tsx`

Props:

- `hint?: ReactNode`
- `label?: string | undefined`
- `size?: "sm" | "md" | undefined`
- `slim?: boolean | undefined`

### ToggleBase — `src/components/base/toggle/toggle.tsx`

Props:

- `className?: string | undefined`
- `isDisabled?: boolean | undefined`
- `isFocusVisible?: boolean | undefined`
- `isHovered?: boolean | undefined`
- `isSelected?: boolean | undefined`
- `size?: "sm" | "md" | undefined`
- `slim?: boolean | undefined`

### Tooltip — `src/components/base/tooltip/tooltip.tsx`

Props:

- `arrow?: boolean | undefined`
- `delay?: number | undefined`
- `description?: ReactNode`
- `title: ReactNode`

### TooltipTrigger — `src/components/base/tooltip/tooltip.tsx`

### BlogSearchBar — `src/components/blog-search-bar.tsx`

Props:

- `defaultValue?: string | undefined`

### AlertSignupForm — `src/components/board/alert-signup-form.tsx`

Props:

- `context?: { source?: string | undefined; jobId?: string | undefined; jobSlug?: string | undefined; } | undefined`
- `description?: string | undefined`
- `filters?: JobAlertFiltersInput | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onSubscribe: (input: JobAlertSubscribeInput) => Promise<{ status: "created" | "duplicate"; }>`
- `title?: string | undefined`

### AlertsBand — `src/components/board/alerts-band.tsx`

Props:

- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onSubscribe: (input: JobAlertSubscribeInput) => Promise<{ status: "created" | "duplicate"; }>`
- `source: string`

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
- `onApply: (jobSlug: string) => Promise<void>`
- `signInHref?: string | undefined`
- `verifyEmailHref?: string | undefined`
- `viewer: { emailVerified: boolean; } | null`

### Breadcrumb — `src/components/board/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

Props:

- `ariaLabel?: string | undefined`
- `items: { name: string; href?: string | undefined; }[]`

### PageBreadcrumb — `src/components/board/breadcrumb.tsx`

The shared breadcrumb trail (nav › ol › li) used by the job-detail and salary pages. Pass an ordered items list; a crumb with no href renders as the current page.

Usage: Render <Breadcrumb items={[{ name, href? }, …]} />. Omit href on the last (current-page) crumb. Links are plain <a> — swap for your router's Link if desired.

Props:

- `ariaLabel: string`
- `items: { name: string; href?: string | undefined; }[]`

### CompanyAvatar — `src/components/board/company-avatar.tsx`

Props:

- `className?: string | undefined`
- `logoUrl?: string | null | undefined`
- `name: string`
- `size?: "sm" | "md" | "lg" | undefined`

### CompanyCard — `src/components/board/company-card.tsx`

Props:

- `companySlug: string`
- `description: string | null`
- `jobCountLabel: string`
- `logoUrl: string | null`
- `name: string`
- `publishedJobCount: number`

### CompanySectionShell — `src/components/board/company-section-header.tsx`

Props:

- `activeSection: CompanySection`
- `breadcrumb: BreadcrumbData`
- `children: ReactNode`
- `company: { name: string; slug: string; logoUrl: string | null; description: string | null; }`
- `hasSalaries: boolean`
- `jobCount: number`

### CopyLinkButton — `src/components/board/copy-link-button.tsx`

Props:

- `className?: string | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `size?: "sm" | "md" | "lg" | undefined`
- `url: string`

### HomeLanding — `src/components/board/home-landing.tsx`

Props:

- `boardName: string`
- `candidatesEnabled: boolean`
- `companies: HomeCompanyCard[]`
- `count?: number | undefined`
- `employersEnabled: boolean`
- `jobs: { id: string; object: "job_card"; slug: string; title: string; publishedAt: string | null; employmentType: "other" | …`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `posts: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`
- `talent: { object: "talent_directory_entry"; handle: string | null; displayName: string | null; headline: string | null; locat…`

### JobCard — `src/components/board/job-card.tsx`

One job in a list — a typed-props display card (logo, title, company, location/type/salary badges, taxonomy chip-links) with no fetching. Shared by the job-search-page and job-detail (Similar jobs) blocks; exports jobDetailPath.

Usage: Feed each card a PublicJobCard from board.jobs.list()/search(). Links are plain <a> on the canonical paths (jobDetailPath → /companies/{companySlug}/jobs/{jobSlug}) — swap for your router's Link for client navigation.

Props:

- `action?: ReactNode`
- `compact?: boolean | undefined`
- `layout?: "row" | "card" | undefined`
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

- `jobs: { id: string; object: "job_card"; slug: string; title: string; publishedAt: string | null; employmentType: "other" | …`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `variant?: "grid" | "rows" | "compact" | undefined`

### JobSearchPage — `src/components/board/job-search-page.tsx`

The board's main listing/search surface: heading + count, canonical filter controls (@cavuno/board/filters vocabulary), job cards, load-more. Data in, callbacks out — your loader owns fetching.

Usage: Fetch with board.jobs.list({ ...filters, cursor, limit: 20 }) (board.jobs.search() when q is set). onFiltersChange → write filters to URL search params and refetch; onLoadMore → refetch with nextCursor and append. Links are plain <a> on the canonical paths — swap for your router's Link for client navigation.

Props:

- `adSlot?: ReactNode`
- `breadcrumb?: BreadcrumbData | undefined`
- `count?: number | undefined`
- `filters: ListingFilters`
- `heading?: string | undefined`
- `jobs: { id: string; object: "job_card"; slug: string; title: string; publishedAt: string | null; employmentType: "other" | …`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `locationSlot?: ReactNode`
- `onFiltersChange: (next: ListingFilters) => void`
- `onPageChange: (page: number) => void`
- `page: number`
- `pageSize: number`
- `relatedSearches?: RelatedSearch[] | undefined`

### JobsNotFound — `src/components/board/jobs-not-found.tsx`

Props:

- `message: string`

### JobsResultsBar — `src/components/board/jobs-results-bar.tsx`

Props:

- `count?: number | undefined`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `onSortChange: (sort: JobSort | undefined) => void`
- `page?: number | undefined`
- `pageSize?: number | undefined`
- `sort: JobSort | undefined`

### JobsSearchControls — `src/components/board/jobs-search-controls.tsx`

Props:

- `filters: ListingFilters`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `locationSlot?: ReactNode`
- `onChange: (next: ListingFilters) => void`

### ListingPageHeader — `src/components/board/listing-page-header.tsx`

Props:

- `breadcrumb?: BreadcrumbData | undefined`
- `eyebrow?: ReactNode`
- `search?: ReactNode`
- `subtitle?: string | null | undefined`
- `title: string`

### ListingSearchBand — `src/components/board/listing-page-header.tsx`

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

- `count: number`
- `onPageChange: (page: number) => void`
- `page: number`
- `pageSize: number`

### ListingRail — `src/components/board/listing-rail.tsx`

Props:

- `adSlot?: ReactNode`
- `relatedChips: TaxonomyChip[]`
- `relatedTitle: string`

### PageBody — `src/components/board/page-body.tsx`

Props:

- `band?: ReactNode`
- `breadcrumb?: BreadcrumbData | undefined`
- `children: ReactNode`
- `className?: string | undefined`
- `rail?: ReactNode`

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

### TaxonomyTags — `src/components/board/taxonomy-tags.tsx`

Props:

- `chips: TaxonomyChip[]`
- `overflow?: number | undefined`
- `size?: "sm" | "md" | "lg" | undefined`

### BoardTheme — `src/components/cavuno/board-theme.tsx`

Props:

- `theme: ThemeInput | null`

### CompanyJobsSearchBar — `src/components/company-jobs-search-bar.tsx`

Props:

- `companySlug: string`
- `defaultValue?: string | undefined`

### CompanySearchBar — `src/components/company-search-bar.tsx`

Props:

- `defaultValue?: string | undefined`

### DangerZone — `src/components/danger-zone.tsx`

### EducationSection — `src/components/education-section.tsx`

Props:

- `items: { id: string; object: "candidate_education"; institutionName: string; institutionUrl: string | null; degree: string |…`

### ExperienceSection — `src/components/experience-section.tsx`

Props:

- `items: { id: string; object: "candidate_experience"; title: string; companyName: string; companyUrl: string | null; location…`

### Dot — `src/components/foundations/dot-icon.tsx`

Props:

- `size?: "sm" | "md" | undefined`

### FeaturedIcon — `src/components/foundations/featured-icon/featured-icon.tsx`

Props:

- `children?: ReactNode`
- `className?: string | undefined`
- `color: "gray" | "brand" | "warning" | "error" | "success"`
- `icon?: ReactNode | FC<{ className?: string | undefined; }>`
- `ref?: Ref<HTMLDivElement> | undefined`
- `size?: "sm" | "md" | "lg" | "xl" | undefined`
- `theme?: "light" | "modern" | "dark" | "gradient" | "outline" | "modern-neue" | undefined`

### BoltIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### ChatGPTIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### ClaudeIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### CursorIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### FigmaIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### GeminiIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### GitHubIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### GrokIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### LovableIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### NextjsIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### PerplexityIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### ReactIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### ReplitIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### TailwindCSSIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### V0Icon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### ViteIcon — `src/components/foundations/integration-icons/index.tsx`

Props:

- `grayscale?: boolean | undefined`

### UntitledLogoMinimal — `src/components/foundations/logo/untitledui-logo-minimal.tsx`

### UntitledLogo — `src/components/foundations/logo/untitledui-logo.tsx`

### AffirmIcon — `src/components/foundations/payment-icons/index.tsx`

### AfterpayIcon — `src/components/foundations/payment-icons/index.tsx`

### AlipayIcon — `src/components/foundations/payment-icons/index.tsx`

### AmazonIcon — `src/components/foundations/payment-icons/index.tsx`

### AmexIcon — `src/components/foundations/payment-icons/index.tsx`

### ApplePayIcon — `src/components/foundations/payment-icons/index.tsx`

### AydenIcon — `src/components/foundations/payment-icons/index.tsx`

### BancontactIcon — `src/components/foundations/payment-icons/index.tsx`

### BinancePayIcon — `src/components/foundations/payment-icons/index.tsx`

### BitcoinCashIcon — `src/components/foundations/payment-icons/index.tsx`

### BitcoinIcon — `src/components/foundations/payment-icons/index.tsx`

### BitpayIcon — `src/components/foundations/payment-icons/index.tsx`

### BraintreeIcon — `src/components/foundations/payment-icons/index.tsx`

### CashAppPayIcon — `src/components/foundations/payment-icons/index.tsx`

### CitadeleIcon — `src/components/foundations/payment-icons/index.tsx`

### CoinbaseIcon — `src/components/foundations/payment-icons/index.tsx`

### DinersClubIcon — `src/components/foundations/payment-icons/index.tsx`

### DiscoverIcon — `src/components/foundations/payment-icons/index.tsx`

### EloIcon — `src/components/foundations/payment-icons/index.tsx`

### EtheriumIcon — `src/components/foundations/payment-icons/index.tsx`

### ForbrugsforeningenIcon — `src/components/foundations/payment-icons/index.tsx`

### GiropayIcon — `src/components/foundations/payment-icons/index.tsx`

### GooglePayIcon — `src/components/foundations/payment-icons/index.tsx`

### IdealIcon — `src/components/foundations/payment-icons/index.tsx`

### InteracIcon — `src/components/foundations/payment-icons/index.tsx`

### JCBIcon — `src/components/foundations/payment-icons/index.tsx`

### KlarnaIcon — `src/components/foundations/payment-icons/index.tsx`

### LightcoinIcon — `src/components/foundations/payment-icons/index.tsx`

### MaestroIcon — `src/components/foundations/payment-icons/index.tsx`

### MastercardIcon — `src/components/foundations/payment-icons/index.tsx`

### PayoneerIcon — `src/components/foundations/payment-icons/index.tsx`

### PayPalIcon — `src/components/foundations/payment-icons/index.tsx`

### PaysafeIcon — `src/components/foundations/payment-icons/index.tsx`

### QiwiIcon — `src/components/foundations/payment-icons/index.tsx`

### RazorpayIcon — `src/components/foundations/payment-icons/index.tsx`

### RevolutIcon — `src/components/foundations/payment-icons/index.tsx`

### RuPayIcon — `src/components/foundations/payment-icons/index.tsx`

### SamsungPayIcon — `src/components/foundations/payment-icons/index.tsx`

### SEPAIcon — `src/components/foundations/payment-icons/index.tsx`

### ShopeePayIcon — `src/components/foundations/payment-icons/index.tsx`

### ShopPayIcon — `src/components/foundations/payment-icons/index.tsx`

### SkrillIcon — `src/components/foundations/payment-icons/index.tsx`

### SofortIcon — `src/components/foundations/payment-icons/index.tsx`

### StripeIcon — `src/components/foundations/payment-icons/index.tsx`

### UnionPayIcon — `src/components/foundations/payment-icons/index.tsx`

### UPIIcon — `src/components/foundations/payment-icons/index.tsx`

### VenmoIcon — `src/components/foundations/payment-icons/index.tsx`

### VerifoneIcon — `src/components/foundations/payment-icons/index.tsx`

### VisaIcon — `src/components/foundations/payment-icons/index.tsx`

### WebmoneyIcon — `src/components/foundations/payment-icons/index.tsx`

### WeChatIcon — `src/components/foundations/payment-icons/index.tsx`

### WeChatPayIcon — `src/components/foundations/payment-icons/index.tsx`

### WiseIcon — `src/components/foundations/payment-icons/index.tsx`

### YandexIcon — `src/components/foundations/payment-icons/index.tsx`

### ZelleIcon — `src/components/foundations/payment-icons/index.tsx`

### ZipPayIcon — `src/components/foundations/payment-icons/index.tsx`

### PlayButtonIcon — `src/components/foundations/play-button-icon.tsx`

Props:

- `isPlaying?: boolean | undefined`

### RatingBadge — `src/components/foundations/rating-badge.tsx`

Props:

- `rating?: number | undefined`
- `subtitle?: string | undefined`
- `theme?: "light" | "dark" | undefined`
- `title?: string | undefined`

### Wreath — `src/components/foundations/rating-badge.tsx`

### RatingStars — `src/components/foundations/rating-stars.tsx`

Props:

- `rating?: number | undefined`
- `starClassName?: string | undefined`
- `stars?: number | undefined`

### StarIcon — `src/components/foundations/rating-stars.tsx`

Props:

- `progress?: number | undefined`

### AngelList — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Apple — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Clubhouse — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Discord — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Dribbble — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Facebook — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Figma — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### GitHub — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Google — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Instagram — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Layers — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### LinkedIn — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Pinterest — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Reddit — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Signal — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Snapchat — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Telegram — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### TikTok — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Tumblr — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### Twitter — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### X — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### YouTube — `src/components/foundations/social-icons/index.tsx`

Props:

- `size?: number | undefined`

### JobAlertFloatingPrompt — `src/components/job-alert-floating-prompt.tsx`

Props:

- `defaults: JobAlertDefaults`
- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`

### JsonLd — `src/components/json-ld.tsx`

Props:

- `data: unknown[]`

### LanguagesSection — `src/components/languages-section.tsx`

Props:

- `languages: Language[]`

### LegalPageView — `src/components/legal-page.tsx`

Props:

- `labels?: Partial<Record<"jobCardLabels" | "navLabels" | "breadcrumbsLabels" | "footerLabels" | "entityLabels" | "jobSearchLabe…`
- `language: string`
- `meta: LegalPageMeta`
- `origin: string`
- `page: { object: "legal_page"; type: string; title: string; content: string; contentFormat: "html"; legalEntity: { legalName…`

### LocationCombobox — `src/components/location-combobox.tsx`

Props:

- `onClear: () => void`
- `onSelect: (place: { slug: string; name: string; }) => void`
- `value?: string | undefined`
- `valueLabel?: string | undefined`

### MessagesNavLink — `src/components/messages-nav-link.tsx`

### Avatar — `src/components/messages/avatar.tsx`

Props:

- `className?: string | undefined`
- `name: string`
- `url: string | null`

### BlockedList — `src/components/messages/blocked-list.tsx`

Props:

- `initial: { id: string; object: "blocked_user"; boardUserId: string; displayName: string; avatarUrl: string | null; createdAt: …`

### Composer — `src/components/messages/composer.tsx`

Props:

- `conversationId: string`
- `disabled: boolean`
- `hint: string | null`
- `onSent: () => void`

### InboxList — `src/components/messages/inbox-list.tsx`

Props:

- `archived: boolean`
- `initial: ListEnvelope<{ id: string; object: "conversation"; lastMessageAt: string; lastMessageSnippet: string; lastMessageAuth…`

### MessageBubble — `src/components/messages/message-bubble.tsx`

Props:

- `message: { id: string; object: "message"; conversationId: string; authorBoardUserId: string; recipientBoardUserId: string; bod…`
- `onChanged: () => void`
- `onReported: () => void`
- `own: boolean`
- `showSeen: boolean`

### ThreadView — `src/components/messages/thread-view.tsx`

Props:

- `blockStatus: { object: "block_status"; blocked: boolean; }`
- `conversation: { id: string; object: "conversation"; lastMessageAt: string; lastMessageSnippet: string; lastMessageAuthorBoardUserId…`
- `messages: ListEnvelope<{ id: string; object: "message"; conversationId: string; authorBoardUserId: string; recipientBoardUserId…`

### NotificationSettings — `src/components/notification-settings.tsx`

Props:

- `preferences: { object: "notification_preference"; channel: "messageEmails" | "applicationEmails"; subscribed: boolean; updatedAt: …`

### EmbeddedCheckout — `src/components/paywall/embedded-checkout.tsx`

Props:

- `kit: { object: "checkout_session"; sessionId: string; clientSecret: string; stripeAccountId: string; publishableKey: strin…`
- `onComplete?: (() => void) | undefined`

### PostCard — `src/components/post-card.tsx`

Props:

- `post: { id: string; object: "public_blog_post"; title: string; slug: string; featured: boolean; coverUrl: string | null; fe…`

### ProfileForm — `src/components/profile-form.tsx`

Props:

- `profile: { id: string; object: "candidate_profile"; displayName: string | null; bio: string | null; avatarUrl: string | null; …`

### ProgrammaticJobsView — `src/components/programmatic-jobs-view.tsx`

Props:

- `adSlot?: ReactNode`
- `count?: number | undefined`
- `filters: ListingFilters`
- `heading: string`
- `jobs: { id: string; object: "job_card"; slug: string; title: string; publishedAt: string | null; employmentType: "other" | …`
- `location?: { slug: string; label: string; } | undefined`
- `origin?: string | undefined`
- `page: number`
- `pageSize: number`
- `relatedSearches?: RelatedSearch[] | undefined`

### Prose — `src/components/prose.tsx`

Props:

- `as?: ElementType | undefined`
- `children?: ReactNode`
- `className?: string | undefined`
- `html?: string | undefined`

### ResumeUpload — `src/components/resume-upload.tsx`

Props:

- `resume: { object: "resume"; parseStatus: "failed" | "parsing" | "parsed" | null; parseFailureReason: string | null; parsedAt:…`

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
- `successHref: "/account" | "/employers/dashboard"`
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

### Circle — `src/components/shared-assets/background-patterns/circle.tsx`

Props:

- `size?: "sm" | "md" | "lg" | undefined`

### GridCheck — `src/components/shared-assets/background-patterns/grid-check.tsx`

Props:

- `size?: "sm" | "md" | undefined`

### Grid — `src/components/shared-assets/background-patterns/grid.tsx`

Props:

- `size?: "sm" | "md" | "lg" | undefined`

### BackgroundPattern — `src/components/shared-assets/background-patterns/index.tsx`

Props:

- `pattern: "circle" | "grid" | "square" | "grid-check"`
- `size?: "sm" | "md" | "lg" | undefined`

### Square — `src/components/shared-assets/background-patterns/square.tsx`

Props:

- `size?: "sm" | "md" | "lg" | undefined`

### CreditCard — `src/components/shared-assets/credit-card/credit-card.tsx`

Props:

- `cardExpiration?: string | undefined`
- `cardHolder?: string | undefined`
- `cardNumber?: string | undefined`
- `className?: string | undefined`
- `company?: string | undefined`
- `type?: CreditCardType | undefined`
- `width?: number | undefined`

### MastercardIcon — `src/components/shared-assets/credit-card/icons.tsx`

### MastercardIconWhite — `src/components/shared-assets/credit-card/icons.tsx`

### PaypassIcon — `src/components/shared-assets/credit-card/icons.tsx`

### BoxIllustration — `src/components/shared-assets/illustrations/box.tsx`

Props:

- `childrenClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `svgClassName?: string | undefined`

### CloudIllustration — `src/components/shared-assets/illustrations/cloud.tsx`

Props:

- `childrenClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `svgClassName?: string | undefined`

### CreditCardIllustration — `src/components/shared-assets/illustrations/credit-card.tsx`

Props:

- `childrenClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `svgClassName?: string | undefined`

### DocumentsIllustration — `src/components/shared-assets/illustrations/documents.tsx`

Props:

- `childrenClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `svgClassName?: string | undefined`

### Illustration — `src/components/shared-assets/illustrations/index.tsx`

Props:

- `childrenClassName?: string | undefined`
- `size?: "sm" | "md" | "lg" | undefined`
- `svgClassName?: string | undefined`
- `type: "box" | "cloud" | "documents" | "credit-card"`

### IPhoneMockup — `src/components/shared-assets/iphone-mockup.tsx`

Props:

- `image: string`
- `imageDark?: string | undefined`
- `theme?: "light" | "dark" | undefined`

### GradientScan — `src/components/shared-assets/qr-code.tsx`

### QRCode — `src/components/shared-assets/qr-code.tsx`

Props:

- `className?: string | undefined`
- `options?: Options | undefined`
- `size?: "md" | "lg" | undefined`
- `value: string`

### SectionDivider — `src/components/shared-assets/section-divider.tsx`

### SkillsSection — `src/components/skills-section.tsx`

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

### Button — `src/components/ui/button.tsx`

Props:

- `size?: "icon" | "xs" | "sm" | "lg" | "default" | "icon-xs" | "icon-sm" | "icon-lg" | null | undefined`
- `variant?: "link" | "secondary" | "default" | "outline" | "ghost" | "destructive" | null | undefined`

Variants — `variant`: default, outline, secondary, ghost, destructive, link

Variants — `size`: default, xs, sm, lg, icon, 'icon-xs', 'icon-sm', 'icon-lg'

### Card — `src/components/ui/card.tsx`

Props:

- `size?: "sm" | "default" | undefined`

### CardAction — `src/components/ui/card.tsx`

### CardContent — `src/components/ui/card.tsx`

### CardDescription — `src/components/ui/card.tsx`

### CardFooter — `src/components/ui/card.tsx`

### CardHeader — `src/components/ui/card.tsx`

### CardTitle — `src/components/ui/card.tsx`

### Input — `src/components/ui/input.tsx`

### Label — `src/components/ui/label.tsx`

### RadioGroup — `src/components/ui/radio-group.tsx`

### RadioGroupItem — `src/components/ui/radio-group.tsx`

### NotFound — `src/components/untitled-ui/not-found.tsx`

### UntitledUiRouterProvider — `src/components/untitled-ui/router-provider.tsx`

Props:

- `children: ReactNode`

## Patterns

Named page-level compositions documented under `docs/patterns/`.
Select a pattern before composing a route (index + drift notes in
`docs/patterns/README.md`). Generated from each page’s frontmatter.

### Account shell — `docs/patterns/account-shell.md`

The logged-in surface chassis — an identity rail, section nav, and content region.

Primitives: AccountShell, CandidateShell, EmployerCompanyShell

### Alert capture — `docs/patterns/alert-capture.md`

The email job-alert subscribe surfaces — dark band, inline form, and floating prompt — over one subscribe contract.

Primitives: AlertsBand, AlertSignupForm, JobAlertFloatingPrompt

### Auth page — `docs/patterns/auth-page.md`

The centered single-column auth shell — mark, display heading, form, OR divider, social buttons.

Primitives: AuthCard, Field, FormError, AuthDivider, SocialButton

### Board card — `docs/patterns/board-card.md`

The avatar/logo + title link + meta + pills card surface shared by job, company, and post cards.

Primitives: Avatar, Badge, TaxonomyTags, initialsOf

### Breadcrumb — `docs/patterns/breadcrumb.md`

The chevron-separated trail of ancestor links ending in the current page — the internal-linking + SEO spine back up the hierarchy.

Primitives: Breadcrumb, AriaLink

### Company section — `docs/patterns/company-section.md`

A company's three public surfaces — profile, jobs, salaries — read as ONE entity behind a shared header with tab navigation.

Primitives: PageBody, Avatar, Badge, Link, Breadcrumb

### Detail page — `docs/patterns/detail-page.md`

A single record shown as a full-bleed header band over a two-column body — prose main plus a sticky right rail.

Primitives: PageBody, JobDetail, Prose, Avatar, Badge, TaxonomyTags

### Empty state — `docs/patterns/empty-state.md`

The zero-results / not-found treatment — a featured icon, title, and description, kept inside the page chrome.

Primitives: EmptyState, FeaturedIcon, JobsNotFound, SalaryEmptyState

### Form feedback — `docs/patterns/form-feedback.md`

The success / error / pending message tied to a form action, announced to assistive tech.

Primitives: FormError

### Form page — `docs/patterns/form-page.md`

A page header, titled field sections, a field grid, and a submit with status — the shape of every data-entry surface.

Primitives: Input, Select, TextAreaBase, Label, Button, FileUpload

### Listing page — `docs/patterns/listing-page.md`

The full-bleed header + search → results bar → list/grid → pagination browse surface every collection page shares.

Primitives: PageBody, ListingPageHeader, ListingSearchBand, JobsResultsBar, JobList, ListingPagination

### Listing rail — `docs/patterns/listing-rail.md`

The sticky right-hand rail of a search/browse listing — an operator ad seam over a related-searches card.

Primitives: ListingRail, TaxonomyTags, PageBody

### Pending / loading — `docs/patterns/pending-loading.md`

The in-flight treatment for loader transitions and submitting actions.

Primitives: LoadingIndicator, Button

### Results header — `docs/patterns/results-header.md`

The honest "Showing X–Y of Z" count and sort control on a single row above the results.

Primitives: JobsResultsBar, Select

### Section heading — `docs/patterns/section-heading.md`

A titled section row with an optional trailing "view all / see all" link.

Primitives: Link, Button

### Stat tile — `docs/patterns/stat-tile.md`

A label + display-value tile for headline metrics and KPI rows.

Primitives: OverallSalaryCard, MetricPanel

### Typography — `docs/patterns/typography.md`

Author every heading (and, gradually, body copy) through one role-named primitive so text stays on the Untitled UI scale.

Primitives: Text, Prose

## Do's and Don'ts

- Do style with the token custom properties; don't hardcode colors.
- Do compose Base UI primitives (`render` prop); never Radix
  `asChild`.
- Do keep components presentational (typed props, no fetching);
  data arrives from route loaders and `src/server/` functions.
- Do reuse the inventory above; don't duplicate an existing
  component to change its style — extend via props/variants.
- Do edit `src/theme.css` directly or with the shadcn CLI and regenerate
  (`pnpm run gen:theme`); don't edit generated files.
- Don't remove or alter the job-detail JSON-LD or `head()` meta.
