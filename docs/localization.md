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
