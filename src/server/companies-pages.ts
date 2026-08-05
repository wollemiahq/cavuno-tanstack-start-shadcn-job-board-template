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

async function seoBase() {
  const boardContext = await getBoard().context();
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
 * /companies/markets/$market — market resolve stays in the route; this
 * function lists companies for an already-canonical market slug.
 */
export const getCompaniesMarketPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      marketSlug: string;
      displayName: string;
      query?: string;
      offset: number;
      limit: number;
    }) => input,
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
            ),
        board.companies.markets({ limit: 24 }, { headers }).catch(() => null),
        seoBase(),
      ]);
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.marketPage_metaTitle({ market: data.displayName }),
            ),
          },
          {
            name: 'description',
            content: m.marketPage_metaDescription({
              market: data.displayName,
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
            { label: data.displayName },
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

/** Company profile head + breadcrumb JSON-LD (data still loaded in route). */
export const getCompanyProfileSeo = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      companyName: string;
      companySlug: string;
      companyId: string;
      description: string | null;
      website: string | null;
      logoUrl: string | null;
      publicUrl: string | null;
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data }) =>
    // OPEN seo base only — company body already fetched by the route.
    (async () => {
      const seo = await seoBase();
      const description = data.description
        ? data.description
            .replace(/<[^>]+>/g, ' ')
            .trim()
            .slice(0, 160)
        : m.companyDetail_metaDescriptionFallback({
            name: data.companyName,
            board: seo.boardName,
          });
      const canonical =
        data.publicUrl ?? selfUrl(seo.origin, companyPath(data.companySlug));
      const head = {
        meta: [
          { title: headTitle(seo.boardName, data.companyName) },
          { name: 'description', content: description },
        ],
        links: [{ rel: 'canonical', href: canonical }],
      };
      const website = data.website
        ? /^https?:\/\//i.test(data.website)
          ? data.website
          : `https://${data.website}`
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
              name: data.companyName,
              identifier: data.companyId,
              ...(data.description
                ? {
                    description: data.description
                      .replace(/<[^>]+>/g, ' ')
                      .trim(),
                  }
                : {}),
              url: website ?? canonical,
              ...(data.logoUrl ? { logo: data.logoUrl } : {}),
              ...(website ? { sameAs: [website] } : {}),
            },
          },
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.companies, href: `${seo.origin}/companies` },
            { label: data.companyName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { seo, head, jsonLd };
    })(),
  );

/** /companies/$slug/jobs — list/search jobs + head + breadcrumb JSON-LD. */
export const getCompanyJobsPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      companySlug: string;
      companyName: string;
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
      const [page, seo, hasSalaries] = await Promise.all([
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
        (async () => {
          try {
            const salary = await board.companies.salaries(data.companySlug, {
              headers,
            });
            return (
              salary.overallSalary !== null || salary.byCategory.length > 0
            );
          } catch (error) {
            if (isNotFound(error)) return false;
            throw error;
          }
        })(),
      ]);
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.companyJobs_metaTitle({ company: data.companyName }),
            ),
          },
          {
            name: 'description',
            content: m.companyJobs_metaDescription({
              company: data.companyName,
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
            { label: data.companyName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { page, seo, hasSalaries, head, jsonLd };
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
