---
name: cavuno-board-filters
description: The canonical listing-filter vocabulary and URL search-param parsing with @cavuno/board/filters — remote/employment/seniority/sort sets, localized seniority labels, and parseListingFilters for jobs-listing routes. Use when building listing pages, filter sidebars, sort dropdowns, or validating listing URL params.
---

# Filters: vocabulary + URL parsing

`@cavuno/board/filters` is the one filter vocabulary every tenant frontend
shares — the seniority set is golden-tested against the platform source, and
URL parsing follows the hosted semantics (hand-typed URLs are messy; parsing
never throws).

## When to use

- The jobs index and every programmatic listing page (category / skill /
  location) — they all layer the same cross-cutting filters on any seed.
- `validateSearch`-style route param validation (server-safe, SSR-ready).

## When not to use

- Turning values into card display text — `cavuno-board-format`.
- Search QUERIES (`jobs.search` bodies) — this module is about the listing
  URL contract, not the search POST body.

## Parse listing URLs

```ts snippet
import { parseListingFilters, DEFAULT_SORT } from '@cavuno/board/filters';

const filters = parseListingFilters(rawSearchParams);
// { q?, remoteOption?, employmentType?, seniority?: Seniority[], sort? }

const page = await board.jobs.list({
  limit: 20,
  seniority: filters.seniority,
  remoteOption: filters.remoteOption ? [filters.remoteOption] : undefined,
  employmentType: filters.employmentType ? [filters.employmentType] : undefined,
});
```

Unknown values are dropped silently (public URLs, never throw). Seniority
accepts repeated params or a comma-string and normalizes with the hosted
rules: trim, lowercase, dedupe, keep order.

## Render the filter UI from the vocabulary

```ts snippet
import {
  REMOTE_OPTIONS,
  EMPLOYMENT_TYPES,
  SENIORITIES,
  JOB_SORTS,
  seniorityLabels,
  sortLabels,
} from '@cavuno/board/filters';

const { language } = await board.context();
const labels = seniorityLabels(language); // de: executive → "Führungskraft"
const sorts = sortLabels(language);       // English defaults on every locale
```

Seniority renders as a MULTI-select (hosted parity). `EMPLOYMENT_TYPES`
deliberately offers 5 of the 7 wire values (`volunteer`/`other` exist on
jobs but are not filter options). `JOB_SORTS` deliberately excludes
`oldest` (ADR-0048); `relevance` is the featured-ranked default.

## Anti-patterns

```ts no-check
// NEVER hand-roll the vocab per page — one page offering 'oldest' or a
// 6th employment type diverges from every other board frontend:
const sorts = ['relevance', 'newest', 'oldest'];
// NEVER trust raw search params into the SDK query:
board.jobs.list({ seniority: rawSearch.seniority });
```

## Out of scope — do not invent exports

No URL BUILDER (routes are app-owned — serialize with your router), no
category/skill/location taxonomy lists (those come from the API:
`board.taxonomy.*`, `jobs.list` filters), no saved-filter persistence.

## Verify

- [ ] `/jobs?seniority=Senior,%20lead&sort=oldest` renders the senior+lead
      selection and the default sort — no crash, no leaked invalid value.
- [ ] The seniority multi-select shows all 8 levels, labeled in the board
      language.
- [ ] The sort dropdown offers exactly relevance / newest / salary_high.
