---
name: Board card
purpose: The avatar/logo + title link + meta + pills card surface shared by job, company, talent, post, and salary records.
primitives: [Card, Avatar, Badge, TaxonomyTags, initialsOf]
usedBy: [src/components/board/job-card.tsx, src/components/board/company-card.tsx, src/components/board/talent-search-result.tsx, src/components/post-card.tsx, src/components/board/salary-sections.tsx]
---

## Purpose

Jobs, companies, public talent profiles, posts, and salary records share the
same owned shadcn vocabulary: `Card` for the surface, `Avatar` for identity,
real title/taxonomy anchors, and semantic theme tokens for meta. The avatar
falls back to two-letter initials through the shared `initialsOf` helper.

## When to use

- A record shown in a grid or list of siblings (`JobList`, company grid, related
  posts).
- **When NOT to use** — the full record view. That is the
  [Detail page](detail-page.md).

## Anatomy

- The owned `Card` surface and its theme-aware radius, ring, and shadow.
- `Avatar` + `AvatarFallback` with `initialsOf(name)`.
- A real title `Link` or `<a href>` to the record.
- Meta text + a `Badge` / `TaxonomyTags` pill row.

## Composition

The initials fallback comes from one shared helper, `src/lib/initials.ts`:

```ts
import { initialsOf } from "@/lib/initials";
// …
<Card>
  <Avatar>
    <AvatarImage src={logoUrl} alt={name} />
    <AvatarFallback>{initialsOf(name)}</AvatarFallback>
  </Avatar>
</Card>
```

## Do / Don't

| Do                                                                         | Don't                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Import `initialsOf` from `@/lib/initials`.                                 | Re-declare a local initials helper.                                     |
| Compose the owned `Card`, `Avatar`, and `Badge` primitives.                | Copy a card shell or revive legacy ring/color tokens.                   |
| Preserve complete names and real hrefs.                                    | Truncate SEO-significant labels or replace anchors with click handlers. |
| Focus the title link with `focus-visible:ring-ring/50 focus-visible:ring-2`. | Drift to a `ring-ring/30`/`ring-3` or bare-`outline` focus idiom.       |
| Layer the stretched `::after` overlay with `after:z-(--z-card-overlay)`.   | Hardcode a magic `after:z-[1]` (see the z-index scale in `styles.css`). |

## Used by

- `JobCard`, `CompanyCard`, `TalentSearchResult`, `PostCard`, and the
  `SalaryRail` link-card.
- The shared helper: `src/lib/initials.ts`, including avatar fallbacks in both
  Talent result and profile projections.

## Related

- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
