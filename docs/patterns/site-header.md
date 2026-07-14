---
name: Site header
purpose: The public shell's context-aware search, centered discovery navigation, and account actions.
primitives: [Header, HeaderSearch, LocationCombobox, Link, Input, Button]
usedBy: [src/components/Header.tsx, src/components/location-combobox.tsx, src/lib/header-search.ts, src/routes/__root.tsx]
---

## Purpose

The public header keeps the board's highest-frequency actions available without
making every directory repeat them. It has three desktop zones: brand and
contextual search on the left, primary discovery navigation in the geometric
center, and account or posting actions on the right.

## When to use

- The shared public shell for Jobs, Companies, Talent, Blog, and their detail pages.
- **When NOT to use** — embedded widgets or compact account/authentication shells.

## Anatomy

- Left zone — board brand followed by the search for the active collection.
- Center zone — Jobs, Companies, Talent, and Blog, subject to board feature gates.
- Right zone — sign-in/account, sign-up, messaging, and posting actions.
- Mobile disclosure — brand and actions stay on row one, contextual search moves
  to row two, and primary navigation moves into the menu.

The center uses equal flexible outer grid tracks around an intrinsic navigation
track. It therefore remains centered when the board name, search, localization,
or account actions change width.

## Search scope

| Active route | Inputs | Submit destination |
| --- | --- | --- |
| Jobs and landing routes | Keyword + canonical location in one grouped bar | `/jobs?q=` or `/jobs/locations/:slug?q=` |
| Companies | Keyword | `/companies?query=` |
| Talent and public profiles | Keyword | `/talent?q=` |
| Blog, article, tag, and author routes | Keyword | `/blog?q=` |

The pathname owns the scope. Do not add a search-type selector: the centered
navigation is the collection switcher, and the URL remains the source of truth
for the current query.

## Composition

```tsx
<header>
  <Container width="wide">
    <div className="grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div data-slot="header-left">
        <Brand />
        <HeaderSearch scope={scope} />
      </div>
      <nav data-slot="header-primary-navigation">…</nav>
      <div data-slot="header-actions">…</div>
    </div>
  </Container>
</header>
```

## Do / Don't

| Do | Don't |
| --- | --- |
| Derive search shape and destination from the active route. | Keep a second search-type control beside primary navigation. |
| Pair Jobs keyword and location inside one visually grouped control. | Split location into an unrelated filter or a second page hero. |
| Keep the navigation geometrically centered with equal outer tracks. | Center it only within leftover flex space. |
| Preserve the URL query on reload, history navigation, and new tabs. | Navigate on every keystroke or keep canonical search state only in React. |
| Collapse navigation into the mobile disclosure before the header crowds. | Force all four links, search, and account actions into one mobile row. |

## Used by

- `src/components/Header.tsx` — responsive three-zone shell and search form.
- `src/lib/header-search.ts` — pathname-to-scope and URL-state resolver.
- `src/routes/__root.tsx` — canonical submit destinations.
- `src/components/location-combobox.tsx` — selected place and accessible suggestions.

## Related

- [Listing page](listing-page.md)
- [Search results](search-results.md)
- [Empty state](empty-state.md)
