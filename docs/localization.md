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

### Where the words live

The words are in `src/url-words.json`, one object per language keyed by the
canonical (English) segment:

```json
{ "nl": { "jobs": "vacatures", "companies": "bedrijven" } }
```

The file belongs to the board: edit a word, or add a language, there. The
Cavuno platform reads the same file, together with `baseLocale` from
`project.inlang/settings.json`, to build links to the board's pages, and `/.well-known/cavuno.json` publishes its role
templates in the base language's words. Keep the path and shape as they are.

It applies to any locale with an entry, whether it is the base locale or a
prefixed one. A locale without an entry, and English, keep the canonical
URLs; a segment a language does not list keeps its canonical word. Only the
locales the board compiles (`locales` in `project.inlang/settings.json`)
reach the app bundle; the build filters the rest out.

Shipped languages: Dutch (`nl`), German (`de`), French (`fr`), Spanish
(`es`), Portuguese (`pt`), Italian (`it`), Polish (`pl`), Czech (`cs`),
Turkish (`tr`), Swedish (`sv`), Danish (`da`), Norwegian Bokmål (`nb`) and
Finnish (`fi`). The words follow URLs on each country's job boards where
one exists, and ASCII spelling (`loen`, `tyopaikat`). Japanese,
Korean, Chinese, Hindi and Russian intentionally have no list: their words
would be percent-encoded in every URL, so those boards keep English paths.

Only static route segments translate: a path is matched against the route
templates in `src/lib/route-templates.ts`, so slugs and other params stay as
they are even when they spell a route word. Typecheck fails when a new route
is missing from that list. Tests check every language in the word file:
each word is URL-safe (lowercase ASCII, hyphenated), each key is a real
page route segment and not a machine path, and no two words collide at the
same position.

Links rendered through TanStack `Link`, `localizePath` and `selfUrl` come out
localized. Canonicals, hreflang (including `x-default`), sitemap entries and
feed item links use the same words. Incoming URLs accept canonical or
localized words, and the server entry answers a GET or HEAD for a canonical
document URL with a 308 to the localized one, keeping the query string.

Machine paths never translate or redirect: `/api`, `/_serverFn`, `/go`,
`/.well-known` (including the route manifest), sitemaps, `robots.txt`,
`ads.txt`, `indexnow-key.txt`, `/p/<handle>`, `/embed`, `/apply`, OG images
and the RSS feeds (`/jobs/rss.xml`, `/blog/rss.xml`). The list lives in
`src/lib/localized-path.ts`.

Words are part of public URLs. Once a board is live, editing or removing a
word, or switching the board language, is a URL migration: links and search
results that use the old word stop resolving, so add board redirects for
them. Canonical English URLs keep redirecting to the current words; a
previous language's words do not.
