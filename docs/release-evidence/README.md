# CAV-512 visual and interaction evidence

- **Date:** 2026-07-14
- **Candidate:** CAV-512 worktree based on `c5c3d63`
- **Runtime:** local production preview at `http://localhost:4173`
- **Data:** committed Cavuno sandbox board
- **Browser:** headless Chrome, real SSR navigation and browser history

These captures are private delivery evidence. They do not authorize a public
deployment, repository visibility change, announcement, or advertising
integration.

## Reviewed captures

| File | Route and state | Viewport | Review |
|---|---|---:|---|
| `home-desktop-light-1440x900.png` | `/`, public home | 1440 × 900 | Current Rhea home, real sandbox jobs and company cards |
| `jobs-selected-desktop-light-1440x900.png` | `/jobs?selectedJob=senior-backend-engineer`, selected job | 1440 × 900 | Master/detail, compact filters, persistent apply action, shadcn Cards and Badges |
| `jobs-selected-desktop-dark-1440x900.png` | Same selected job, forced dark class | 1440 × 900 | Dark tokens and selected-card contrast reviewed |
| `jobs-selected-mobile-390x844.png` | Same selected job, mobile list projection | 390 × 844 | Single-column cards, compact search, mobile disclosure |
| `jobs-selected-breakpoint-767x900.png` | Same selected job, below `md` | 767 × 900 | Single-column boundary reviewed |
| `jobs-selected-breakpoint-768x900.png` | Same selected job, at `md` | 768 × 900 | Two-column boundary and persistent action reviewed |
| `jobs-selected-wide-1920x1080.png` | Same selected job, wide shell | 1920 × 1080 | Centered content and reserved side-rail space reviewed |
| `job-full-desktop-light-1440x900.png` | Canonical full job page | 1440 × 900 | Same-tab title destination and full-page apply/save surface |
| `companies-selected-desktop-light-1440x900.png` | `/companies`, selected company | 1440 × 900 | Company search and master/detail state |
| `talent-empty-desktop-light-1440x900.png` | `/talent`, sandbox empty state | 1440 × 900 | Supported empty directory state |
| `blog-desktop-light-1440x900.png` | `/blog`, content archive | 1440 × 900 | Content search/archive surface |
| `post-job-desktop-light-1440x900.png` | `/post`, posting form | 1440 × 900 | Public posting form composition |
| `messages-authenticated-desktop-light-1440x900.png` | `/messages`, authenticated empty inbox | 1440 × 900 | Dedicated two-column messaging shell |
| `employer-dashboard-desktop-light-1440x900.png` | `/employers/dashboard`, authenticated unassociated employer | 1440 × 900 | Company-connect entry state |
| `candidate-settings-desktop-light-1440x900.png` | `/settings`, authenticated candidate | 1440 × 900 | Candidate account shell and shadcn Switch controls |
| `embed-jobs-desktop-light-1024x768.png` | `/embed/jobs`, embeddable jobs list | 1024 × 768 | Embed surface with real sandbox records |

`../screenshot-home.png` is the current homepage capture and duplicates the
first row for the README.

## Browser route exercise

The same browser session exercised these representative families and verified
the resulting title/heading or machine-readable body:

- public: `/`, `/jobs`, `/companies`, `/talent`, `/blog`, `/salaries`;
- canonical detail: `/companies/technova-labs` and
  `/companies/technova-labs/jobs/senior-backend-engineer`;
- candidate: anonymous redirects for `/account` and `/me/applications`, then a
  real disposable sandbox signup, verification-required routing, and the
  authenticated `/settings` surface;
- messaging: authenticated `/messages` with its empty two-column inbox;
- employer and posting: `/employers`, authenticated `/employers/dashboard`,
  and `/post`;
- embed: `/embed/jobs`; and
- SEO/distribution: `/robots.txt`, `/sitemap.xml`, and `/jobs/rss.xml`.

The disposable signup created a real HTTP-only session. The sandbox had no
mail-delivery credential, so verification-required candidate pages could not
be advanced past the six-digit-code gate. The sandbox user had no associated
employer company, so the employer exercise correctly stopped at “Connect your
company” instead of mutating a shared fixture tenant.

## Search interaction exercise

TanStack Router is configured with `scrollRestoration: true`; the result list
and detail panes expose stable `data-scroll-restoration-id` attributes. A real
1440 × 900 browser run measured the following sequence:

1. Scroll the first history entry's jobs list to `700px`.
2. Activate “Senior Backend Engineer”: the list stayed at `700px` and the
   detail pane reset to `0px`.
3. Scroll the new entry's list to `1400px`.
4. Back restored the first entry to `700px`.
5. Forward restored the second entry to `1400px`.
6. Refresh preserved the active entry at `1400px`.

Canonical anchors, same-tab primary activation, and modified-click passthrough
are covered by component and selection tests. The browser run confirmed the
nested-pane behavior using TanStack's official per-history-entry `__TSR_key`
state rather than a parallel custom scroll store.
Real-browser keyboard and visible-focus traversal remains open evidence,
including the floating messaging and search/detail controls.

## Open evidence

This is meaningful current evidence, but it is not the entire CAV-512 gate.
The committed sandbox does not currently supply a sponsored result, a populated
talent directory, an employer-owned company, or a verified candidate inbox.
No screenshot is labelled as one of those states. Loading and forced network
error visuals remain covered by component tests rather than a committed
browser capture. The Board doctor still has two skipped suites, documented
in `../publish-gate.md`. Those gaps keep CAV-512 open.
