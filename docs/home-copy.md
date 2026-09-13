# Home copy templates

`src/content/migration-home.json` holds optional homepage and SEO text.
Prepare copies authored strings verbatim. `null` keeps the starter default;
`""` is an intentional empty value.

The existing home loader resolves text through `src/server/home-copy.ts`
and passes plain strings to the UI. The helper does not fetch, await data,
evaluate expressions, or run in a hydration effect.

| Token | Value from existing page data |
| --- | --- |
| `{{board_name}}` | Current board name |
| `{{job_count}}` | Total jobs, including zero |
| `{{count}}` | Jobs, companies or posts total in the corresponding section |
| `{{job_label}}` | Configured job label, singular when the jobs total is one |
| `{{company_label}}` | Configured company label, singular when its total is one |
| `{{candidate_label}}` | Configured candidate label, singular when its total is one |

Hero and SEO have no implicit `count`; use `job_count` when that is intended.
Counts are formatted for the active locale. A list response may omit its total;
never substitute the number of visible cards or fetch extra data for a token.

If any token is missing, unknown or malformed, the entire field falls back:
hero heading to the board name, other headings/buttons to their starter copy,
and descriptions to empty. An absent override still keeps the starter copy.
Templates resolve again whenever the existing loader data refreshes, subject
to its existing caching policy. The helper adds no separate cache or request.
