# shadcn component cross-reference

This starter owns the shadcn Base UI/Rhea component source in `src/components/ui`. Product code should compose these primitives before creating new interaction chrome. Domain components remain appropriate when they add job-board behavior, state, or information architecture that a primitive does not provide.

## Catalog baseline

`components.json` is the registry source of truth:

- Style: `base-rhea`
- Primitive library: Base UI
- Icon library: Lucide
- Theme file: `src/theme.css`
- Component alias: `@/components/ui`

The complete installable catalog is installed. On 14 July 2026, the real `shadcn add --all --yes` command fetched the registry and installed the catalog dependencies. It then stopped at the overwrite prompt because the starter already owns the generated source. The final `shadcn add --all --dry-run --yes` resolved all 61 generated outputs as owned overwrites, with zero files to create. This is intentional: shadcn distributes source code, and the starter keeps its Rhea theme scope, localization, and product-safe extensions instead of blindly overwriting them.

The release boundary is shadcn-only: the retired Untitled UI component directories, icon packages, helper utilities, and compatibility styles are absent. `src/shadcn-only-release.test.ts` scans the production tree and dependency manifest so that parallel presentation code cannot silently return.

The `form` item is a composition recipe, so the catalog produces 60 production component files plus `src/hooks/use-mobile.ts`:

| Family | Installed components |
| --- | --- |
| Actions and controls | Button, Button Group, Checkbox, Radio Group, Slider, Switch, Toggle, Toggle Group |
| Inputs and forms | Calendar, Combobox, Command, Field, Input, Input Group, Input OTP, Label, Native Select, Select, Textarea |
| Navigation | Breadcrumb, Menubar, Navigation Menu, Pagination, Sidebar, Tabs |
| Overlays | Alert Dialog, Context Menu, Dialog, Drawer, Dropdown Menu, Hover Card, Popover, Sheet, Tooltip |
| Content and feedback | Accordion, Alert, Aspect Ratio, Attachment, Avatar, Badge, Card, Carousel, Chart, Empty, Item, Kbd, Progress, Skeleton, Spinner, Table |
| Layout and behavior | Collapsible, Direction, Resizable, Scroll Area, Separator |
| Messaging | Bubble, Marker, Message, Message Scroller |
| Notifications | Sonner |

The remaining catalog pages do not each generate a standalone component file. Form and Data Table are build guides. Date Picker composes Calendar and Popover. Toast is deprecated in favor of Sonner. Typography provides utility-class examples rather than default component styles. In this starter, Field and React Hook Form provide form anatomy, Table is the data-table foundation, Calendar and Popover provide date-picker primitives, Sonner owns notifications, and the single typeset layer owns typography.

Installing the catalog does not mean every component should appear in the demo. It means every canonical primitive is available, theme-compatible, and can replace an equivalent without adding another UI dependency.

## Product cross-reference

| Product surface | Canonical shadcn primitives | Decision |
| --- | --- | --- |
| Search result surfaces | Card, Avatar, Badge, Skeleton | Use Card for result surfaces, Badge for taxonomy, and Skeleton only for the changing detail body. |
| Search workspace geometry | Page, Container, SearchResultsLayout, SearchResultsList, SearchResultDetail | Retain the domain layout. Fixed master–detail geometry, ad rails, route selection, and scroll restoration are product patterns rather than primitive behavior. |
| Header search | Button Group, Input Group, Combobox, Button | The joined keyword/location control is adopted while retaining route-aware job, company, talent, and blog submission. |
| Job filters | Field Set, Field Legend, Field Group, Field, Select, Checkbox, Sheet | The filter state machine is retained and its field anatomy composes the owned primitives. |
| Search feedback | Alert, Empty, Button | Use Alert for gated/retry callouts and Empty for no-result states. |
| Full job page | Breadcrumb, Card, Badge, Button | Use the owned families while retaining the SEO and job-detail composition. |
| Messaging lists | Item, Avatar, Badge, Empty | Replace repeated media/content/action row anatomy. |
| Message composer | Input Group, Input Group Textarea, Input Group Button | Replace the positioned textarea/send-button shell. |
| Message thread | Message, Bubble, Marker, Message Scroller, Dropdown Menu | Retain the domain thread composition; it already uses the messaging primitives. |
| Messaging dock and page | Card plus domain layout | Retain the fixed dock and two-pane geometry because Card does not own those behaviors. |
| Employer forms | Field, Field Label, Field Description, Field Error, Input, Select, Textarea | Replace repeated label/control/error wrappers. |
| Employer company lookup | Combobox | Replace the manually positioned autocomplete and its custom keyboard semantics. |
| Destructive account actions | Alert Dialog | Replace inline confirmation disclosures so focus and modal inertness are owned by Base UI. |
| Resume attachment | Attachment | Replace the hand-built bordered file row. |
| Rich-text editor | Toggle, Tooltip, Popover, Separator, Input, Button | Retain the Tiptap domain editor; its toolbar already composes owned primitives. |
| Page layout | Page, PageContent, PageHeader, PageSection, Container, Stack, Grid, Box, Bleed | Retain these pattern-level layout components. They constrain tokens and landmarks above shadcn primitives. |

## Component-by-component disposition

“Adopted” means product code imports the owned component today. “Available” means the source is installed and verified, but the starter does not invent a demo interaction merely to exercise it. “Intentionally native” means a simpler semantic browser element better matches the current requirement.

| Component | Status | Product evidence or intended use |
| --- | --- | --- |
| Accordion | Available | Use for independently expandable content groups when the product introduces them. |
| Alert | Adopted | Search retry/gated-result feedback and other prominent recoverable states. |
| Alert Dialog | Adopted | Typed destructive account deletion with Base UI focus management. |
| Aspect Ratio | Available | Use for constrained media previews; current logos and avatars already have fixed dimensions. |
| Attachment | Adopted | Stored résumé file row and actions. |
| Avatar | Adopted | Jobs, companies, talent, authors, accounts, and messaging identities. |
| Badge | Adopted | Job taxonomy, statuses, result metadata, and unread counts. |
| Breadcrumb | Adopted | The single root-owned `ShellBreadcrumb` trail implementation. |
| Bubble | Adopted | Message bubble alignment and grouped message chrome. |
| Button | Adopted | Canonical actions and link rendering throughout the starter. |
| Button Group | Adopted | Joined keyword/location/search control in the global header. |
| Calendar | Available | Foundation for a future date-picker composition; no date field is currently required. |
| Card | Adopted | Job cards, full-job actions, employer surfaces, search controls, messaging panes, and account surfaces. |
| Carousel | Available | No carousel interaction exists in the current product specification. |
| Chart | Available | No analytics chart exists in the current product specification. |
| Checkbox | Adopted | Filters, profile settings, alert settings, and résumé consent. |
| Collapsible | Adopted | Accessible mobile-header navigation disclosure. |
| Combobox | Adopted | Location search and employer company lookup with async domain adapters. |
| Command | Available | Installed for command palettes and searchable action menus; no command palette is specified. |
| Context Menu | Available | Installed for contextual actions; current explicit menus remain easier to discover. |
| Dialog | Adopted | Employer create/edit flows. |
| Direction | Available | Installed for explicit direction providers; the current locale layer owns document direction. |
| Drawer | Available | Installed for mobile edge panels; filters use Sheet because they are task controls rather than navigation drawers. |
| Dropdown Menu | Adopted | Message/thread actions and rich contextual actions. |
| Empty | Adopted | Search, messaging, account, employer, and archive empty states. |
| Field | Adopted | Search filters, search controls, employer forms, posting, alert signup, and destructive confirmation fields. |
| Hover Card | Available | No hover-only disclosure is required; important information remains visible or navigable. |
| Input | Adopted | Canonical text controls across auth, candidate, employer, and posting flows. |
| Input Group | Adopted | Header search, company/talent search, messaging composer, location/company comboboxes, and alert signup. |
| Input OTP | Adopted | Email verification code entry. |
| Item | Adopted | Messaging inbox and blocked-user rows. |
| Kbd | Available | No keyboard shortcut reference is currently exposed. |
| Label | Adopted | Canonical accessible labels where Field is not the owning composition. |
| Marker | Adopted | Message-thread timeline marker. |
| Menubar | Available | The primary navigation is a set of route links, not an application menubar. |
| Message | Adopted | Message-thread structure. |
| Message Scroller | Adopted | Conversation scrolling and follow-latest behavior. |
| Native Select | Intentionally native | Installed as an escape hatch, but product selects use the non-native Base UI Select requested by the starter specification. |
| Navigation Menu | Intentionally native | Primary navigation is a simple semantic `nav` of links; there are no compound navigation flyouts. |
| Pagination | Adopted | Search result pagination and page-window behavior. |
| Popover | Adopted | Rich-text link editing. |
| Progress | Adopted | Candidate profile completeness exposes a meaningful determinate percentage. |
| Radio Group | Adopted | Auth and option-selection flows. |
| Resizable | Intentionally native | Master/detail widths are product-defined; users were not given a resize requirement. |
| Scroll Area | Intentionally native | Results/detail regions use native overflow and scroll restoration without custom scrollbar behavior. |
| Select | Adopted | Jobs filters, result sorting, profile fields, messaging, and employer workflows. |
| Separator | Adopted | Layout/account/editor separation and composed primitive internals. |
| Sheet | Adopted | Mobile jobs filters. |
| Sidebar | Available | The public job board uses top navigation; an application sidebar is not specified. |
| Skeleton | Adopted | Detail transitions, candidate routes, messaging, and public-content loading. |
| Slider | Available | No continuous numeric control is currently required. |
| Sonner | Available | Installed notification foundation; current flows keep feedback next to the action that caused it. |
| Spinner | Adopted | Async combobox and pending-action feedback where geometry is stable. |
| Switch | Available | Current binary settings are explicit checkboxes; use Switch only for immediate on/off settings. |
| Table | Adopted | Employer job management and structured salary data. |
| Tabs | Available | Current page navigation is route-based rather than local tab state. |
| Textarea | Adopted | Candidate, employer, and messaging multiline input. |
| Toggle | Adopted | Rich-text editor toolbar state. |
| Toggle Group | Available | The editor exposes independent formatting toggles, not an exclusive grouped choice. |
| Tooltip | Adopted | Compact rich-text toolbar actions. |

## Migration ledger

The status below cross-references the catalog against product code, not merely the filesystem. “Retained” means a domain component still exists but composes the named shadcn primitives.

| Area | Status | Evidence |
| --- | --- | --- |
| Job cards, result cards, and selected detail | Adopted | `JobCard` and `SearchResultCard` compose Card; job results and detail compose Avatar, Badge, Button, Empty, and Skeleton. |
| Company and talent search | Adopted | Results compose Avatar, Badge, Button, Empty, Select, and Skeleton; controls compose Card, Field, Input Group, and Select. |
| Blog and home cards | Adopted | Archives use Empty; articles and homepage collections compose Avatar, Badge, Button, Card, and Empty. |
| Employer workspace and posting | Adopted | Workspace pages compose Card, Table, Dialog, Empty, Field, Input, Select, and Textarea; employer lookup composes Combobox. |
| Messaging thread | Adopted | MessageBubble and ThreadView compose Message, Bubble, Marker, Message Scroller, Dropdown Menu, Select, Avatar, and Button. |
| Messaging list and composer | Adopted | Domain behavior is retained; inbox/blocked rows compose Item and Empty, while the composer composes Input Group. |
| Header search and mobile disclosure | Adopted | Route behavior is retained; the joined shell composes Button Group, Input Group, and Combobox, while mobile navigation composes Collapsible. |
| Destructive account confirmation | Adopted | The typed confirmation composes Card, Alert Dialog, Field, Input, and Button. |
| Résumé file row | Adopted | The stored file and delete action compose Attachment. |

### Replaced in the jobs search slice

- Search result chrome now renders the owned Card.
- The shared `JobCard` now composes Card and Card Content in both grid and row layouts instead of recreating the surface styles.
- Job taxonomy links now render the owned Badge instead of borrowing its class generator.
- Selected-job loading keeps the action bar geometry and makes stale controls inert while the changing body renders the owned Skeleton.
- The desktop search workspace uses the same 80rem layout token as the header/filter canvas and fills the viewport without a magic height subtraction.

### Ongoing product review

Catalog installation and the cross-reference migration are complete. Future route work should still decide whether inline feedback belongs to a Field or a prominent Alert, and whether a domain list item is semantic content or a Card. Those decisions must be based on interaction meaning, not on maximizing component counts.

## Verification commands

```sh
shadcn add --all --dry-run --yes
vp test run src/shadcn-only-release.test.ts src/theme-foundation.test.ts
```

The first command must report no files to create. The contract tests must confirm the canonical theme entry, the owned component directory, and the absence of the retired presentation layer.

### Intentionally retained domain components

- SearchResultsLayout, SearchResultsList, SearchResultDetail, and AdRail
- JobSearchPage, JobsResultsBar, JobsFilterToolbar, and ListingPagination
- MessagingDock, MessagingLayout, ThreadView, and RichTextEditor
- AccountShell, EmployerCompanyShell, and PostJobForm
- Page, PageContent, PageHeader, PageSection, Container, Stack, Grid, Box, and Bleed

These components express patterns, workflows, or domain state. Replacing them with generic primitives would erase useful meaning rather than remove duplication.

## Adoption rule

Before adding UI code:

1. Check `src/components/ui` for the primitive.
2. Compose a domain component only when it adds product meaning or state.
3. Use tokens from `src/theme.css`; do not hard-code a parallel visual system.
4. Keep canonical primitive names and APIs so another shadcn Base UI project can swap its owned components with minimal product-code changes.
5. Add a new primitive only through the shadcn CLI and cross-reference it here.
