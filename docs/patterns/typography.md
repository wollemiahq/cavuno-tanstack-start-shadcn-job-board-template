---
name: Typography
purpose: Keep authored interface text on the shadcn/Geist theme scale and rendered HTML in one shadcn Typeset preset.
primitives: [PageHeader, PageSection, CardTitle, Prose]
usedBy: [src/components/layout/page.tsx, src/components/prose.tsx, src/components/post-card.tsx, src/components/board/blog-article-content.tsx, src/components/board/salary-sections.tsx]
---

## Purpose

The theme owns typography. Authored interface text uses the semantic styles
already built into shadcn components, while trusted rendered HTML uses one
`typeset typeset-content` preset through `Prose`. Both paths inherit Geist and
the active `theme.css` variables, so changing a shadcn/create preset updates the
starter without introducing route-specific type scales.

## When to use

- Use `PageHeader`, `PageSection`, `CardTitle`, `EmptyTitle`, and other owned
  components for authored headings in application UI.
- Use `Prose` for sanitized HTML from jobs, blog posts, and legal content.
- **When NOT to use** — do not add a second article, docs, compact, or marketing
  Typeset preset. Layout controls width; Typeset controls rich-text rhythm.

## Anatomy

- Geist is loaded once and exposed through the theme font variables.
- shadcn components pair semantic elements with the shared heading/body classes.
- `Prose` is the only JSX gateway to `typeset typeset-content`.
- `src/typeset.css` owns links, lists, headings, tables, code, and block quotes
  inside rendered HTML, including dark mode.

## Page-title scale

Every page's `h1` resolves its size from a primitive variant — never a raw
`text-*` class at the call site. There is ONE standard page-title size and ONE
sanctioned larger hero exception; the smaller `h1` roles below are deliberate,
not page titles.

| Role | Size | Primitive |
| --- | --- | --- |
| **Standard page title** (the default for every page) | `text-3xl` | `PageHeader` (default `size`) or `Text variant="heading1"` |
| **Hero band** (marketing / home top-of-page only) | `text-4xl md:text-5xl` | `PageHeader size="display"` or `Text variant="display"` |
| Detail identity band (job / company / talent profile hero) | `text-2xl md:text-3xl` | `Text variant="heading2"` in the [Detail page](detail-page.md) band |
| Results-count heading (paginated listings) | `text-lg` | `JobsResultsBar` ([Results header](results-header.md)) |
| Auth shell heading | `text-2xl` | the centered [Auth page](auth-page.md) shell |
| Empty / error / not-found state title | `text-lg`–`text-xl` | the state card, not a page title |

Standard workspace and form pages (employer company workspace, candidate
settings, saved jobs, "Post a job", onboarding, applicants) all take the
**standard** tier — `text-3xl`. Do not drop a workspace page to `text-2xl`; that
was accidental drift, corrected to the standard here. Reach for `display` only
for a genuine marketing hero band, never a workspace or form page.

## Composition

```tsx
<PageHeader title={post.title} description={post.customExcerpt} />

<PageSection title={copy.relatedPosts}>
  <PostGrid posts={related} />
</PageSection>

<Prose aria-label={copy.articleBody} html={post.html} />
```

## Do / Don't

| Do                                                                            | Don't                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Let owned components provide the page and section type roles.                 | Rebuild the same heading classes in every route.                          |
| Render sanitized HTML through `Prose`.                                        | Apply Typeset classes directly at multiple call sites.                    |
| Change typography through `theme.css`, Geist, and the one Typeset stylesheet. | Add a parallel `typeset-article`, `typeset-docs`, or legacy prose system. |
| Let the page layout own readable width.                                       | Put a max-width contract inside the Typeset preset.                       |

## Used by

- `PageHeader` and `PageSection` own page and section headings.
- `PostCard` and salary cards use shadcn card typography.
- `BlogArticleContent` uses one `Prose` body for the complete article.
- Job descriptions and other trusted HTML reuse the same `Prose` gateway.

## Related

- [Detail page](detail-page.md)
- [Section heading](section-heading.md)
- [Board card](board-card.md)
