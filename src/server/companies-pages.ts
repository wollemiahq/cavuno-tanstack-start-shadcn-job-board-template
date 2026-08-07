import { isNotFound } from '@cavuno/board';
/**
 * Route-family-owned server boundary for companies listing + profile pages.
 *
 * Head meta + breadcrumb/salary JSON-LD are computed here so route modules
 * do not import `@cavuno/board/seo` or breadcrumbsCopy for head()/module
 * scope — same pattern as jobs-listing-pages / getJobDetailPage.
 */
import {
  BOARD_PATHS,
  boardUrl,
  companyMarketPath,
  companyPath,
  companySalaryPath,
} from '@cavuno/board/paths';
import {
  buildSalaryFaq,
  companyCategorySalaryJsonLd,
  companySalaryJsonLd,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatSalaryStatRange,
} from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import {
  companyCategorySalaryPath,
  salaryCompanyCategoryTitle,
  salaryCompanyTitle,
} from '../board/salary-view-model';
import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { composeSalaryFaqs } from '@/lib/salary-faq';
import { selfUrl } from '@/lib/self-url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** Public company wire field; treat missing/undefined as 0 (pre-field APIs). */
function companySalarySampleCount(company: unknown): number {
  if (!company || typeof company !== 'object') return 0;
  const n = (company as { salarySampleCount?: unknown }).salarySampleCount;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

async function seoBase() {
  const boardContext = await readBoardContext();
  const origin = new URL(getRequest().url).origin;
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

/** /companies/ index — list/search + markets + head + breadcrumb JSON-LD. */
export const getCompaniesIndexPage = createServerFn({ method: 'GET' })
  .validator(
    (input: { query?: string; offset: number; limit: number }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [page, markets, seo] = await Promise.all([
        data.query
          ? board.companies.search(
              {
                query: data.query,
                offset: data.offset,
                limit: data.limit,
              },
              undefined,
              { headers },
            )
          : board.companies.list(
              { offset: data.offset, limit: data.limit },
              { headers },
            ),
        board.companies.markets({ limit: 24 }, { headers }).catch(() => null),
        seoBase(),
      ]);
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.companiesIndex_metaTitle()),
          },
          {
            name: 'description',
            content: m.companiesIndex_metaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.companies),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.companies },
          ]),
        ].filter((entry) => entry !== null),
      );
      return {
        page,
        markets: markets?.data ?? [],
        seo,
        head,
        jsonLd,
      };
    }),
  );

/**
 * /companies/markets/$market — market resolve + listing + head in ONE server fn.
 *
 * Trade-off: resolve joins the same Promise.all as the listing query, so an
 * alias slug that 308-redirects still fetches a listing that is then discarded.
 * That path is rare; the common path saves a full serial round-trip wave.
 */
export const getCompaniesMarketPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      marketSlug: string;
      query?: string;
      offset: number;
      limit: number;
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      // Market resolve used to be a separate `await` in the route loader,
      // serializing an extra upstream round trip (and an extra /_serverFn hop
      // on client-side navigation) in front of the listing + markets + SEO batch.
      // The listing outcome is CAPTURED rather than awaited directly: the
      // companies listing rejects (400/404) on an unknown market slug, so
      // once it shares this batch with the resolve, an unrecognised slug
      // would reject the batch before the resolve's verdict could be read —
      // a 404 page turning into a 500. The resolve decides; on a market that
      // really exists the listing error is re-thrown unchanged below.
      const [market, pageResult, markets, seo] = await Promise.all([
        (async () => {
          try {
            return await board.companies.markets.resolve(data.marketSlug, {
              headers,
            });
          } catch (error) {
            if (isNotFound(error)) return null;
            throw error;
          }
        })(),
        (async () => {
          try {
            return {
              ok: true as const,
              value: await (data.query
                ? board.companies.search(
                    {
                      query: data.query,
                      marketSlug: data.marketSlug,
                      offset: data.offset,
                      limit: data.limit,
                    },
                    undefined,
                    { headers },
                  )
                : board.companies.list(
                    {
                      marketSlug: data.marketSlug,
                      offset: data.offset,
                      limit: data.limit,
                    },
                    { headers },
                  )),
            };
          } catch (error) {
            return { ok: false as const, error };
          }
        })(),
        board.companies.markets({ limit: 24 }, { headers }).catch(() => null),
        seoBase(),
      ]);
      if (!market) return { kind: 'not_found' as const };
      if (market.redirectTo) {
        return { kind: 'redirect' as const, to: market.redirectTo };
      }
      if (!pageResult.ok) throw pageResult.error;
      const page = pageResult.value;
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.marketPage_metaTitle({ market: market.displayName }),
            ),
          },
          {
            name: 'description',
            content: m.marketPage_metaDescription({
              market: market.displayName,
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, companyMarketPath(data.marketSlug)),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.companies,
              href: selfUrl(seo.origin, BOARD_PATHS.companies),
            },
            { label: market.displayName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return {
        kind: 'ok' as const,
        market,
        page,
        markets: markets?.data ?? [],
        seo,
        head,
        jsonLd,
      };
    }),
  );

/** Company profile head + breadcrumb JSON-LD (data still loaded in route). */
/**
 * /companies/$slug — the whole profile in ONE server fn.
 *
 * Company body, its jobs, the salary gate and the SEO base all resolve in a
 * SINGLE parallel batch; head + JSON-LD are then assembled synchronously.
 * This used to be a route-level `Promise.all` of three reads followed by a
 * separate awaited SEO call, which serialized a second upstream wave (and a
 * second /_serverFn hop on client-side navigation) purely to build head tags
 * out of data already in hand.
 */
/** Categories shown in the profile's salary teaser (matches queries.ts). */
const COMPANY_SALARY_SUMMARY_CATEGORIES = 5;

export const getCompanyProfilePage = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [company, jobs, seo] = await Promise.all([
        board.companies.retrieve(data.companySlug, undefined, { headers }),
        board.companies.listJobs(data.companySlug, {}, { headers }),
        seoBase(),
      ]);
      // Tab gate is free on the company wire; full salary payload only loads
      // when there is a sample (overview teaser needs the aggregates).
      const salarySampleCount = companySalarySampleCount(company);
      const hasSalaries = salarySampleCount > 0;
      const salarySummary = hasSalaries
        ? await (async () => {
            try {
              const salary = await board.companies.salaries(data.companySlug, {
                headers,
              });
              return {
                overallSalary: salary.overallSalary,
                byCategory: salary.byCategory.slice(
                  0,
                  COMPANY_SALARY_SUMMARY_CATEGORIES,
                ),
                currency: salary.currency,
              };
            } catch (error) {
              if (isNotFound(error))
                return {
                  overallSalary: null,
                  byCategory: [],
                  currency: null as string | null,
                };
              throw error;
            }
          })()
        : {
            overallSalary: null,
            byCategory: [] as never[],
            currency: null as string | null,
          };
      const description = company.description
        ? company.description
            .replace(/<[^>]+>/g, ' ')
            .trim()
            .slice(0, 160)
        : m.companyDetail_metaDescriptionFallback({
            name: company.name,
            board: seo.boardName,
          });
      const canonical =
        company.links.public ?? selfUrl(seo.origin, companyPath(company.slug));
      const head = {
        meta: [
          { title: headTitle(seo.boardName, company.name) },
          { name: 'description', content: description },
        ],
        links: [{ rel: 'canonical', href: canonical }],
      };
      const website = company.website
        ? /^https?:\/\//i.test(company.website)
          ? company.website
          : `https://${company.website}`
        : null;
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: canonical,
            mainEntity: {
              '@type': 'Organization',
              '@id': `${canonical}#organization`,
              name: company.name,
              identifier: company.id,
              ...(company.description
                ? {
                    description: company.description
                      .replace(/<[^>]+>/g, ' ')
                      .trim(),
                  }
                : {}),
              url: website ?? canonical,
              ...(company.logoUrl ? { logo: company.logoUrl } : {}),
              ...(website ? { sameAs: [website] } : {}),
            },
          },
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.companies, href: `${seo.origin}/companies` },
            { label: company.name },
          ]),
        ].filter((entry) => entry !== null),
      );
      return {
        company,
        jobs,
        salarySummary,
        hasSalaries,
        seo,
        head,
        jsonLd,
      };
    }),
  );

/** /companies/$slug/jobs — list/search jobs + head + breadcrumb JSON-LD. */
export const getCompanyJobsPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      companySlug: string;
      q?: string;
      location?: string;
      offset: number;
      limit: number;
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      // Company + jobs + SEO in one wave. Salaries tab visibility uses
      // `company.salarySampleCount` on the public company wire (not a full
      // companies.salaries document) — that field is the job-count of the
      // salary sample and is free with retrieve.
      const [company, page, seo] = await Promise.all([
        board.companies.retrieve(data.companySlug, undefined, { headers }),
        data.q
          ? board.jobs.search(
              {
                query: data.q,
                filters: {
                  companySlug: [data.companySlug],
                  ...(data.location ? { location: data.location } : {}),
                },
                offset: data.offset,
                limit: data.limit,
              },
              undefined,
              { headers },
            )
          : board.jobs.list(
              {
                companySlug: [data.companySlug],
                ...(data.location ? { location: data.location } : {}),
                offset: data.offset,
                limit: data.limit,
              },
              { headers },
            ),
        seoBase(),
      ]);
      // Prefer the dedicated sample count (API field). Fall back for older
      // APIs: never pull the full salary document just to gate a tab.
      const hasSalaries = companySalarySampleCount(company) > 0;
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.companyJobs_metaTitle({ company: company.name }),
            ),
          },
          {
            name: 'description',
            content: m.companyJobs_metaDescription({
              company: company.name,
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: `${selfUrl(seo.origin, companyPath(data.companySlug))}/jobs`,
          },
        ],
      };
      // Home → Companies → {Company} — entity trail only (tab row marks Jobs).
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.companies,
              href: selfUrl(seo.origin, BOARD_PATHS.companies),
            },
            { label: company.name },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { company, page, seo, hasSalaries, head, jsonLd };
    }),
  );

/** /companies/$slug/salaries — salary aggregate + head + JSON-LD. */
export const getCompanySalariesPage = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [salary, company, seo] = await Promise.all([
        board.companies.salaries(data.companySlug, { headers }),
        board.companies.retrieve(data.companySlug, undefined, { headers }),
        seoBase(),
      ]);
      const locale = seo.language;
      const range = salary.overallSalary
        ? formatSalaryStatRange(
            locale,
            salary.overallSalary.avgMin,
            salary.overallSalary.avgMax,
            salary.currency,
          )
        : null;
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              salaryCompanyTitle(locale, salary.companyName, range),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.companySalaries_metaDescriptionWithData({
                  company: salary.companyName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.companySalaries_metaDescriptionEmpty({
                  company: salary.companyName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, companySalaryPath(salary.companySlug)),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const faqEntries = buildSalaryFaq(
        locale,
        salary.companyName,
        salary.overallSalary,
        salary.currency,
      );
      const faqs = composeSalaryFaqs(faqEntries);
      const jsonLd = asJsonObjects(
        [
          companySalaryJsonLd(salary, {
            occupationUrl: ({ categorySlug }) =>
              boardUrl(
                seo.origin,
                companyCategorySalaryPath(salary.companySlug, categorySlug),
              ),
          }),
          faqJsonLd(faqs),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.companies,
              href: selfUrl(seo.origin, BOARD_PATHS.companies),
            },
            {
              label: salary.companyName,
              href: selfUrl(seo.origin, companyPath(salary.companySlug)),
            },
            { label: c.salaries },
          ]),
        ].filter((entry) => entry !== null),
      );
      // faqs ride the loader for SalaryFaq UI (same payload as JSON-LD FAQPage).
      return { salary, company, seo, head, jsonLd, faqs };
    }),
  );

/** /companies/$slug/salaries/$category — category salary + head + JSON-LD. */
export const getCompanyCategorySalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string; categorySlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [salary, seo] = await Promise.all([
        board.companies.salaries.category(
          data.companySlug,
          data.categorySlug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const locale = seo.language;
      const range = salary.overallSalary
        ? formatSalaryStatRange(
            locale,
            salary.overallSalary.avgMin,
            salary.overallSalary.avgMax,
            salary.currency,
          )
        : null;
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              salaryCompanyCategoryTitle(
                locale,
                salary.companyName,
                salary.categoryName,
                range,
              ),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.companySalaries_categoryMetaDescriptionWithData({
                  category: salary.categoryName,
                  company: salary.companyName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.companySalaries_categoryMetaDescriptionEmpty({
                  category: salary.categoryName,
                  company: salary.companyName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              companyCategorySalaryPath(
                salary.companySlug,
                salary.categoryCanonicalSlug,
              ),
            ),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const label = m.companySalaries_categoryAtCompanyLabel({
        category: salary.categoryName,
        company: salary.companyName,
      });
      const faqEntries = buildSalaryFaq(
        locale,
        label,
        salary.overallSalary,
        salary.currency,
      );
      const faqs = composeSalaryFaqs(faqEntries);
      const jsonLd = asJsonObjects(
        [
          companyCategorySalaryJsonLd(salary),
          faqJsonLd(faqs),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.companies,
              href: selfUrl(seo.origin, BOARD_PATHS.companies),
            },
            {
              label: salary.companyName,
              href: selfUrl(seo.origin, companyPath(salary.companySlug)),
            },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, companySalaryPath(salary.companySlug)),
            },
            { label: salary.categoryName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, head, jsonLd, faqs };
    }),
  );
