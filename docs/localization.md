# Localization

The starter compiles English by default. Dutch ships as a complete dormant
catalog in `messages/nl.json`, with matching legal/about templates. Enable it
with `pnpm locale:add nl`, then run `pnpm gen:messages && pnpm gen:paraglide`.
The language switcher displays **Nederlands**. A Dutch-only board sets both
`baseLocale` and its sole `locales` entry to `nl` in `project.inlang/settings.json`.

## Dutch terminology

Translate complete sentences after reading the component or route that uses
the key. Use **je/jij** in candidate and employer interfaces; the legal
template's operator instructions use **u/uw**.

| Context | Dutch wording |
| --- | --- |
| Job listing / employer publishes a listing | vacature / vacature plaatsen |
| Candidate applies for a job | solliciteren / sollicitatie |
| Search applies filters | filters toepassen |
| Resume and optional cover note | cv / korte motivatie |
| Recruitment pipeline stage | selectiefase |
| Internship employment type | stage |
| Job title and seniority filters | functietitel / ervaringsniveau |
| Passwordless email sign-in | inloglink |
| Salary period | per uur, per maand, per jaar, as appropriate |

Check plan copy against its purchase flow: one-off vacancy packages and
recurring subscriptions need distinct wording. Candidate search and employer
applicant management also describe different actions and audiences.

Keep interpolation inputs and plural declarations intact. Dutch count
messages use `one` for 1 and the wildcard arm for other counts. Run the
catalog-contract and plural tests, compile Dutch, and exercise the translated
UI. Structural checks cannot establish translation quality.

Board-authored job descriptions, company names, and other content retain the
board's content language. Legal/about pages ship as explicitly marked
templates; their Dutch entries preserve that status and the existing noindex
behavior.

## Localized URL segments

Route files stay English; the URLs people and crawlers see use the board
language's words. On a Dutch board `/jobs` is served as `/vacatures`,
`/companies/acme` as `/bedrijven/acme`, and `/jobs/locations/amsterdam` as
`/vacatures/locaties/amsterdam`. A prefixed locale uses its own words
(`/fr/emplois`).

It is automatic for any locale with a word list in
`SEGMENT_TRANSLATIONS` (`src/lib/localized-path.ts`), whether it is the base
locale or a prefixed one. A locale without a list, and English, keep the
canonical URLs. Only static route segments translate: a path is matched
against the route templates in `src/lib/route-templates.ts`, so slugs and
other params stay as they are even when they spell a route word. Typecheck
fails when a new route is missing from that list, and a test fails when two
words collide at the same position.

Links rendered through TanStack `Link`, `localizePath` and `selfUrl` come out
localized. Canonicals, hreflang (including `x-default`), sitemap entries and
feed item links use the same words. Incoming URLs accept canonical or
localized words, and the server entry answers a GET or HEAD for a canonical
document URL with a 308 to the localized one, keeping the query string.

Machine paths never translate or redirect: `/api`, `/_serverFn`, `/go`,
`/.well-known` (including the route manifest), sitemaps, `robots.txt`,
`ads.txt`, `indexnow-key.txt`, `/p/<handle>`, `/embed`, `/apply`, OG images
and the RSS feeds (`/jobs/rss.xml`, `/blog/rss.xml`). The list lives next to
the word lists.

Words are part of public URLs. Changing one after launch is a URL migration:
links and search results that use the old word stop resolving, so add a
board redirect for them.
