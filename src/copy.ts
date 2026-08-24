/**
 * The canonical chrome-copy compatibility adapter.
 *
 * Runtime routes and components import the smallest resolver under
 * `copy-groups/` that they use. Keeping this complete adapter gives tests and
 * compatibility callers one authoritative representation of the public
 * `UiCopy` contract without making every message family reachable from the
 * universal client entry.
 *
 * Copy resolves from compiled Paraglide messages keyed by the runtime locale
 * (`getLocale()` — the URL locale; extra chrome prefixes like `/de/`
 * only exist after those locales are compiled).
 * Operator label overrides (`board.labels` / `BoardLabelOverrides`) were
 * removed from the Board API in 4.0.0 — the catalog is the sole source.
 * The `language` parameter callers thread is retained for the block prop
 * contract but no longer selects the catalog: `baseLocale === board.language`
 * is a generation-time invariant (project.inlang/settings.json is emitted
 * per board), so the unprefixed site renders the board language and prefixed
 * locales follow the URL.
 */
import { alertsCopy } from './copy-groups/alerts';
import { applyCopy } from './copy-groups/apply';
import { blogCopy } from './copy-groups/blog';
import { breadcrumbsCopy } from './copy-groups/breadcrumbs';
import { copyLinkCopy } from './copy-groups/copy-link';
import { entityCopy } from './copy-groups/entity';
import { footerCopy } from './copy-groups/footer';
import { jobCardCopy } from './copy-groups/job-card';
import { jobDetailCopy } from './copy-groups/job-detail';
import { jobSearchCopy } from './copy-groups/job-search';
import { navCopy } from './copy-groups/nav';
import { paginationCopy } from './copy-groups/pagination';
import { salaryCopy } from './copy-groups/salary';

/**
 * Nested chrome-copy object returned by `boardCopy`. Mirrors the former
 * SDK `UiCopy` shape. Each group retains its concrete message keys, and the
 * two parameterized job-detail messages retain their positional contracts.
 */
export type BoardCopy = {
  alerts: ReturnType<typeof alertsCopy>;
  apply: ReturnType<typeof applyCopy>;
  blog: ReturnType<typeof blogCopy>;
  breadcrumbs: ReturnType<typeof breadcrumbsCopy>;
  copyLink: ReturnType<typeof copyLinkCopy>;
  entity: ReturnType<typeof entityCopy>;
  footer: ReturnType<typeof footerCopy>;
  jobCard: ReturnType<typeof jobCardCopy>;
  jobDetail: ReturnType<typeof jobDetailCopy>;
  jobSearch: ReturnType<typeof jobSearchCopy>;
  nav: ReturnType<typeof navCopy>;
  pagination: ReturnType<typeof paginationCopy>;
  salary: ReturnType<typeof salaryCopy>;
};

export function boardCopy(_language?: string | undefined): BoardCopy {
  return {
    alerts: alertsCopy(),
    apply: applyCopy(),
    blog: blogCopy(),
    breadcrumbs: breadcrumbsCopy(),
    copyLink: copyLinkCopy(),
    entity: entityCopy(),
    footer: footerCopy(),
    jobCard: jobCardCopy(),
    jobDetail: jobDetailCopy(),
    jobSearch: jobSearchCopy(),
    nav: navCopy(),
    pagination: paginationCopy(),
    salary: salaryCopy(),
  } satisfies BoardCopy;
}
