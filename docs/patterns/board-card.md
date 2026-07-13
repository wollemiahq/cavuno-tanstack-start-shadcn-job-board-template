---
name: Board card
purpose: The avatar/logo + title link + meta + pills card surface shared by job, company, talent, and post cards.
primitives: [Avatar, Badge, TaxonomyTags, initialsOf]
usedBy: [src/components/board/job-card.tsx, src/components/board/company-card.tsx, src/components/board/talent-search-result.tsx, src/components/post-card.tsx, src/components/board/salary-sections.tsx]
---

## Purpose

Jobs, companies, public talent profiles, and posts all render as a card with the same surface: an
avatar/logo, a title that links to the record, a line of meta, and a row of
pills, on `rounded-xl` with a hover shadow lift. The avatar falls back to
two-letter initials via the shared `initialsOf` helper.

## When to use

- A record shown in a grid or list of siblings (`JobList`, company grid, related
  posts).
- **When NOT to use** — the full record view. That is the
  [Detail page](detail-page.md).

## Anatomy

- The card surface: `rounded-xl … ring-1 ring-secondary_alt shadow-xs hover:shadow-md`.
- `Avatar` with `initials={initialsOf(name)}` for the logo fallback.
- A title `Link`/`AriaLink` to the record.
- Meta text + a `Badge` / `TaxonomyTags` pill row.

## Composition

The initials fallback comes from one shared helper, `src/lib/initials.ts`:

```ts
import { initialsOf } from "@/lib/initials";
// …
<Avatar size="xl" src={logoUrl} initials={initialsOf(name)} alt={name} />
```

## Do / Don't

| Do | Don't |
|---|---|
| Import `initialsOf` from `@/lib/initials`. | Re-declare a local `function initialsOf` — eight files still carry a byte-identical copy (`job-card`, `company-card`, `job-detail`, `salary-sections`, `post-card`, `blog.author.$authorSlug`, `companies.$companySlug.index`, `blog.$postSlug`); migrate them to the shared helper, do not add a ninth. |
| Reuse the `ring-secondary_alt shadow-xs hover:shadow-md` surface. | Copy the surface class string into a new bespoke card. |

## Used by

- `JobCard`, `CompanyCard`, `TalentSearchResult`, `PostCard`, and the
  `SalaryRail` link-card.
- The shared helper: `src/lib/initials.ts`, including avatar fallbacks in both
  Talent result and profile projections.

## Related

- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
