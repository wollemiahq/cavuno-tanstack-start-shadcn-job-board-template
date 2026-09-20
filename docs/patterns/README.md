# Patterns

The **pattern** layer for this template. A _pattern_ is a named, documented
page-or-section composition — the level above a single component. Where `DESIGN.md` inventories the primitives (tokens + components),
this folder documents how they assemble into the recurring surfaces of the app.

These are examples of the current board, not required layouts. Reuse or adapt a
composition when it fits; create a different composition when the requested
experience needs one. Shared primitives and theme tokens keep new designs
consistent without requiring the same page structure.

The generated ## Patterns section of DESIGN.md uses each page's
name, purpose, and primitives frontmatter. The remaining prose and metadata
are there to help people customize the board and can evolve with the product.

## Taxonomy

| #   | Pattern                                 | Composes                                                                                            | Owns                                                                               |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| P1  | [Listing page](listing-page.md)         | Page, Bleed, PageHeader, PageContent, ListingSearchBand, JobsResultsBar, JobList, ListingPagination | Searchable collection surfaces without an in-place desktop detail.                 |
| P2  | [Results header](results-header.md)     | JobsResultsBar, Select                                                                              | The honest "Showing X–Y of Z" count + sort row.                                    |
| P3  | [Detail page](detail-page.md)           | Page, Bleed, PageHeader, PageContent, JobDetail, Avatar, Badge, TaxonomyTags                        | A single record: header band over a two-column body with a sticky rail.            |
| P4  | [Section heading](section-heading.md)   | PageSection, Link, Button                                                                           | A titled section row with an optional "view all" link.                             |
| P5  | [Board card](board-card.md)             | Avatar, Badge, TaxonomyTags, initialsOf                                                             | The shared job/company/post card surface.                                          |
| P6  | [Breadcrumb](breadcrumb.md)             | Breadcrumb, AriaLink                                                                                | The ancestor trail ending in the current page.                                     |
| P7  | [Alert capture](alert-capture.md)       | AlertsBand, AlertSignupForm, JobAlertFloatingPrompt                                                 | The job-alert subscribe surfaces.                                                  |
| P8  | [Empty state](empty-state.md)           | Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent                           | Zero-results and not-found treatments.                                             |
| P9  | [Form page](form-page.md)               | Card, Field, FieldSet, FieldGroup, FieldLabel, FieldDescription, FieldError, Input, Select, Textarea, Checkbox, Button | Multi-field data-entry surfaces.                                                   |
| P10 | [Auth page](auth-page.md)               | AuthCard, Field, FieldLabel, Input, FieldError, FieldSeparator, Button                               | The centered single-column auth shell.                                             |
| P11 | [Account shell](account-shell.md)       | AccountShell, CandidateShell, EmployerCompanyShell                                                  | The logged-in surface chassis.                                                     |
| P12 | [Form feedback](form-feedback.md)       | Alert, AlertDescription, FieldError, FieldDescription, Spinner                                      | The success/error/pending status tied to an action.                                |
| P13 | [Stat tile](stat-tile.md)               | OverallSalaryCard, MetricPanel                                                                      | Label + display-value metric tiles.                                                |
| P14 | [Pending / loading](pending-loading.md) | Skeleton, Spinner, Button                                                                           | Route, master-detail, and action pending treatments.                               |
| P15 | [Listing rail](listing-rail.md)         | SearchResultsLayout, AdRail, Badge                                                                  | The listing's operator ad seam + crawlable related-searches links.                 |
| P16 | [Company section](company-section.md)   | Page, PageHeader, PageContent, PageSection, Avatar, Badge, Link, Breadcrumb                         | The shared company header + tab navigation across profile / jobs / salaries.       |
| P17 | [Typography](typography.md)             | Text, Prose                                                                                         | Role-named authored text and typeset rich content on the shared shadcn theme scale. |
| P18 | [Search results](search-results.md)     | SearchResultsLayout, SearchResultsList, SearchResultDetail, SearchResultCard, AdRail                | Responsive master–detail directories with optional outer advertising rails.        |
| P19 | [Site header](site-header.md)           | Header, HeaderSearch, LocationCombobox, Link, Input, Button                                         | Contextual public search, centered discovery navigation, and account actions.       |
| P20 | [Messaging](messaging.md)               | MessagingLayout, MessagingDock, Message, Bubble, Marker, MessageScroller, Attachment, Avatar, Textarea, Button | Dedicated and floating board-user conversations with one responsive interaction model. |

## Using these patterns

Start with the shared components and semantic tokens that fit the requested
experience. Adapt a pattern, combine patterns, or create a different
composition when that produces a better board; the examples do not define a
required route shape.
