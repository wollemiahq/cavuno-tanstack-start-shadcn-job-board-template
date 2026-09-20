# Localization

The starter contains English only. Builder provisions the board's language
plus English when a different language is selected.

For a manually managed board, `pnpm locale:add nl` creates an English seed
when the Dutch catalog is absent, without enabling it. Translate that catalog,
then rerun `pnpm locale:add nl` and `pnpm gen:paraglide`. Keep English as the
alternative locale when the board's default is another language.

`en-XA` and `ar-XB` are generated QA artifacts, not installed public languages.
`scripts/pseudo-locale-enable.mjs` creates them for a temporary QA build.

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
