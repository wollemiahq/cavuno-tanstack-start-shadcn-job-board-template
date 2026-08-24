/**
 * Route-family-owned server boundary for the public salaries surfaces.
 *
 * Head meta + salary/ItemList/FAQ/Breadcrumb JSON-LD are computed here so
 * route modules do not import `@cavuno/board/seo` or head-time copy into the
 * universal client entry — same pattern as jobs-listing-pages /
 * companies-pages / getJobDetailPage. Folded each route's prior data RPC +
 * getSeoBase into one page fn so client navigation does not gain a head-only
 * round trip.
 *
 * Salary aggregates and formatted ranges come from the Board SDK builders
 * only (never recomputed here). sourceSlug → canonicalSlug 308 redirects
 * stay in the route loader after this returns.
 */
import {
  BOARD_PATHS,
  boardUrl,
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  crossAxisSalaryJsonLd,
  faqJsonLd,
  formatSalaryStatRange,
  itemListJsonLd,
  locationSalaryJsonLd,
  skillSalaryJsonLd,
  titleSalaryJsonLd,
} from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import {
  salaryEntityInPlaceTitle,
  salaryEntityTitle,
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salaryPlaceTitle,
  salarySkillInLocationPath,
  salarySkillLocationsPath,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
  toLocationHierarchyCrumbs,
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

/**
 * JSON-LD is schema.org-shaped nested objects. TanStack Start's server-fn
 * serializer rejects `Record<string, unknown>` (`unknown` is not serializable),
 * so we reify the builders' output as a plain JSON value tree.
 */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // SDK SEO builders, then JSON round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
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

// ── Hub ─────────────────────────────────────────────────────────────────────

/**
 * One server boundary for the salary hub's data and localized metadata.
 *
 * TanStack route loaders are isomorphic and remain in the universal client
 * entry. Keeping Paraglide messages and SEO helpers inside this handler lets
 * the client retain only the server-function stub, while SSR and client
 * navigation still resolve the request locale through Paraglide middleware.
 * The four independent API reads are also batched into the existing RPC
 * instead of creating a client-side request fan-out.
 */
export const getSalaryHubPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const locale = getLocale();
      const [companies, titles, skills, locations, seo] = await Promise.all([
        board.salaries.companies.list({ headers }),
        board.salaries.titles.list({ locale }, { headers }),
        board.salaries.skills.list({ locale }, { headers }),
        board.salaries.locations.list({ locale }, { headers }),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.salaryHub_metaTitle()),
          },
          {
            name: 'description',
            content: m.salaryHub_metaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.salaries),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.salaries },
          ]),
        ].filter((entry) => entry !== null),
      );

      return {
        companies: companies.data,
        titles: titles.data,
        skills: skills.data,
        // Top-level places only (the hub preview); the index page shows the
        // full hierarchy.
        locations: locations.data.filter(
          (location) => location.parentSlug === null,
        ),
        seo,
        head,
        jsonLd,
      };
    }),
  );

// ── Index hubs (Tier 2) ─────────────────────────────────────────────────────

export const getSalaryCompaniesIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [companies, seo] = await Promise.all([
        getBoard().salaries.companies.list({ headers }),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.salaryHub_companiesMetaTitle()),
          },
          {
            name: 'description',
            content: m.salaryHub_companiesMetaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.salaryCompanies),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            companies.data.map((co) => ({
              name: co.companyName,
              url: selfUrl(seo.origin, companySalaryPath(co.companySlug)),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            { label: c.companies },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { companies: companies.data, seo, head, jsonLd };
    }),
  );

export const getSalaryTitlesIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [titles, seo] = await Promise.all([
        getBoard().salaries.titles.list({ locale: getLocale() }, { headers }),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.salaryHub_titlesMetaTitle()),
          },
          {
            name: 'description',
            content: m.salaryHub_titlesMetaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.salaryTitles),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            titles.data.map((t) => ({
              name: t.name,
              url: selfUrl(seo.origin, salaryTitlePath(t.slug)),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            { label: m.salaryHub_jobTitlesCrumbLabel() },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { titles: titles.data, seo, head, jsonLd };
    }),
  );

export const getSalarySkillsIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [skills, seo] = await Promise.all([
        getBoard().salaries.skills.list({ locale: getLocale() }, { headers }),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.salaryHub_skillsMetaTitle()),
          },
          {
            name: 'description',
            content: m.salaryHub_skillsMetaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.salarySkills),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            skills.data.map((s) => ({
              name: s.name,
              url: selfUrl(seo.origin, salarySkillPath(s.slug)),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            { label: c.skills },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { skills: skills.data, seo, head, jsonLd };
    }),
  );

export const getSalaryLocationsIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [locations, seo] = await Promise.all([
        getBoard().salaries.locations.list(
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.salaryHub_locationsMetaTitle()),
          },
          {
            name: 'description',
            content: m.salaryHub_locationsMetaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, BOARD_PATHS.salaryLocations),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            locations.data.map((l) => ({
              name: l.placeName,
              url: selfUrl(seo.origin, salaryLocationPath(l.placeSlug)),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            { label: c.locations },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { locations: locations.data, seo, head, jsonLd };
    }),
  );

// ── Detail pages (Tier 2) ───────────────────────────────────────────────────

export const getTitleSalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [salary, seo] = await Promise.all([
        getBoard().salaries.titles.retrieve(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const locale = seo.language;
      const c = breadcrumbsCopy();
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
              salary.overallSalary
                ? salaryEntityTitle(locale, salary.categoryName, range!)
                : m.salaryDetail_titleHeading({
                    title: salary.categoryName,
                  }),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.salaryDetail_titleMetaDescriptionWithData({
                  title: salary.categoryName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.salaryDetail_titleMetaDescriptionEmpty({
                  title: salary.categoryName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, salaryTitlePath(salary.canonicalSlug)),
          },
        ],
      };
      const faqEntries = buildSalaryFaq(
        locale,
        salary.categoryName,
        salary.overallSalary,
        salary.currency,
      );
      const faqs = composeSalaryFaqs(faqEntries);
      const jsonLd = asJsonObjects(
        [
          titleSalaryJsonLd(salary),
          faqJsonLd(faqs),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.titles,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryTitles),
            },
            { label: salary.categoryName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, head, jsonLd, faqs };
    }),
  );

export const getSkillSalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [salary, seo] = await Promise.all([
        getBoard().salaries.skills.retrieve(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const locale = seo.language;
      const c = breadcrumbsCopy();
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
              salary.overallSalary
                ? salaryEntityTitle(locale, salary.skillName, range!)
                : m.salaryDetail_skillHeading({
                    skill: salary.skillName,
                  }),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.salaryDetail_skillMetaDescriptionWithData({
                  skill: salary.skillName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.salaryDetail_skillMetaDescriptionEmpty({
                  skill: salary.skillName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, salarySkillPath(salary.canonicalSlug)),
          },
        ],
      };
      const faqEntries = buildSalaryFaq(
        locale,
        salary.skillName,
        salary.overallSalary,
        salary.currency,
      );
      const faqs = composeSalaryFaqs(faqEntries);
      const jsonLd = asJsonObjects(
        [
          skillSalaryJsonLd(salary),
          faqJsonLd(faqs),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.skills,
              href: selfUrl(seo.origin, BOARD_PATHS.salarySkills),
            },
            { label: salary.skillName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, head, jsonLd, faqs };
    }),
  );

export const getLocationSalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [salary, seo, tree] = await Promise.all([
        board.salaries.locations.retrieve(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
        // Breadcrumb enrichment only: on failure the trail degrades to the
        // place itself instead of faulting a page whose own data loaded fine.
        board.salaries.locations
          .list({ locale: getLocale() }, { headers })
          .catch(() => null),
      ]);
      const locale = seo.language;
      const c = breadcrumbsCopy();
      const hierarchy = toLocationHierarchyCrumbs(
        tree?.data ?? [],
        salary.canonicalSlug,
        salary.placeName,
      );
      const breadcrumbTrail = [
        { name: c.home, href: BOARD_PATHS.home },
        { name: c.salaries, href: BOARD_PATHS.salaries },
        { name: c.locations, href: BOARD_PATHS.salaryLocations },
        ...hierarchy,
      ];
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
              salaryPlaceTitle(locale, salary.placeName, range),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.salaryDetail_placeMetaDescriptionWithData({
                  place: salary.placeName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.salaryDetail_placeMetaDescriptionEmpty({
                  place: salary.placeName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, salaryLocationPath(salary.canonicalSlug)),
          },
        ],
      };
      const faqEntries = buildSalaryFaq(
        locale,
        salary.placeName,
        salary.overallSalary,
        salary.currency,
      );
      const faqs = composeSalaryFaqs(faqEntries);
      const jsonLd = asJsonObjects(
        [
          locationSalaryJsonLd(salary, {
            occupationUrl: ({ categorySlug }) =>
              selfUrl(seo.origin, salaryTitlePath(categorySlug)),
          }),
          faqJsonLd(faqs),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.locations,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryLocations),
            },
            ...hierarchy.map((crumb) =>
              crumb.href
                ? { label: crumb.name, href: selfUrl(seo.origin, crumb.href) }
                : { label: crumb.name },
            ),
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, hierarchy, breadcrumbTrail, head, jsonLd, faqs };
    }),
  );

// ── Cross-axis listings ─────────────────────────────────────────────────────

export const getTitleLocationsPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [payload, seo] = await Promise.all([
        getBoard().salaries.titles.locations(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.salaryDetail_titleLocationsMetaTitle({
                title: payload.categoryName,
              }),
            ),
          },
          {
            name: 'description',
            content:
              payload.locations.length === 1
                ? m.salaryDetail_titleLocationsMetaDescriptionOne({
                    title: payload.categoryName,
                    count: payload.locations.length,
                  })
                : m.salaryDetail_titleLocationsMetaDescriptionMany({
                    title: payload.categoryName,
                    count: payload.locations.length,
                  }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salaryTitleLocationsPath(payload.canonicalSlug),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            payload.locations.map((l) => ({
              name: l.placeName,
              url: boardUrl(
                seo.origin,
                salaryTitleInLocationPath(payload.canonicalSlug, l.placeSlug),
              ),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.titles,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryTitles),
            },
            {
              label: payload.categoryName,
              href: boardUrl(
                seo.origin,
                salaryTitlePath(payload.canonicalSlug),
              ),
            },
            { label: c.locations },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { data: payload, seo, head, jsonLd };
    }),
  );

export const getSkillLocationsPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [payload, seo] = await Promise.all([
        getBoard().salaries.skills.locations(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.salaryDetail_skillLocationsMetaTitle({
                skill: payload.skillName,
              }),
            ),
          },
          {
            name: 'description',
            content:
              payload.locations.length === 1
                ? m.salaryDetail_skillLocationsMetaDescriptionOne({
                    skill: payload.skillName,
                    count: payload.locations.length,
                  })
                : m.salaryDetail_skillLocationsMetaDescriptionMany({
                    skill: payload.skillName,
                    count: payload.locations.length,
                  }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salarySkillLocationsPath(payload.canonicalSlug),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            payload.locations.map((l) => ({
              name: l.placeName,
              url: boardUrl(
                seo.origin,
                salarySkillInLocationPath(payload.canonicalSlug, l.placeSlug),
              ),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.skills,
              href: selfUrl(seo.origin, BOARD_PATHS.salarySkills),
            },
            {
              label: payload.skillName,
              href: boardUrl(
                seo.origin,
                salarySkillPath(payload.canonicalSlug),
              ),
            },
            { label: c.locations },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { data: payload, seo, head, jsonLd };
    }),
  );

export const getLocationTitlesPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [payload, seo] = await Promise.all([
        getBoard().salaries.locations.titles(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      // Flat hosted shape: Home › Salaries › Locations › {Place}(linked) › Titles.
      const breadcrumbTrail = [
        { name: c.home, href: BOARD_PATHS.home },
        { name: c.salaries, href: BOARD_PATHS.salaries },
        { name: c.locations, href: BOARD_PATHS.salaryLocations },
        {
          name: payload.placeName,
          href: salaryLocationPath(payload.canonicalSlug),
        },
        { name: c.titles },
      ];
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.salaryDetail_titlesInPlaceMetaTitle({
                place: payload.placeName,
              }),
            ),
          },
          {
            name: 'description',
            content: m.salaryDetail_titlesInPlaceMetaDescription({
              place: payload.placeName,
              count: payload.titles.length,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salaryLocationTitlesPath(payload.canonicalSlug),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            payload.titles.map((t) => ({
              name: t.name,
              url: boardUrl(
                seo.origin,
                salaryTitleInLocationPath(t.slug, payload.canonicalSlug),
              ),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.locations,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryLocations),
            },
            {
              label: payload.placeName,
              href: boardUrl(
                seo.origin,
                salaryLocationPath(payload.canonicalSlug),
              ),
            },
            { label: c.titles },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { data: payload, seo, breadcrumbTrail, head, jsonLd };
    }),
  );

export const getLocationSkillsPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [payload, seo] = await Promise.all([
        getBoard().salaries.locations.skills(
          data.slug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const c = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: c.home, href: BOARD_PATHS.home },
        { name: c.salaries, href: BOARD_PATHS.salaries },
        { name: c.locations, href: BOARD_PATHS.salaryLocations },
        {
          name: payload.placeName,
          href: salaryLocationPath(payload.canonicalSlug),
        },
        { name: c.skills },
      ];
      const head = {
        meta: [
          {
            title: headTitle(
              seo.boardName,
              m.salaryDetail_skillsInPlaceMetaTitle({
                place: payload.placeName,
              }),
            ),
          },
          {
            name: 'description',
            content: m.salaryDetail_skillsInPlaceMetaDescription({
              place: payload.placeName,
              count: payload.skills.length,
            }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salaryLocationSkillsPath(payload.canonicalSlug),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          itemListJsonLd(
            payload.skills.map((s) => ({
              name: s.name,
              url: boardUrl(
                seo.origin,
                salarySkillInLocationPath(s.slug, payload.canonicalSlug),
              ),
            })),
          ),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.locations,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryLocations),
            },
            {
              label: payload.placeName,
              href: boardUrl(
                seo.origin,
                salaryLocationPath(payload.canonicalSlug),
              ),
            },
            { label: c.skills },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { data: payload, seo, breadcrumbTrail, head, jsonLd };
    }),
  );

// ── Cross-axis detail ───────────────────────────────────────────────────────

export const getTitleLocationSalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; locationSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [salary, seo] = await Promise.all([
        getBoard().salaries.titles.location(
          data.slug,
          data.locationSlug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const locale = seo.language;
      const c = breadcrumbsCopy();
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
              salary.overallSalary
                ? salaryEntityInPlaceTitle(
                    locale,
                    salary.categoryName,
                    salary.placeName,
                    range!,
                  )
                : m.salaryDetail_titleInPlaceHeading({
                    title: salary.categoryName,
                    place: salary.placeName,
                  }),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.salaryDetail_titleInPlaceMetaDescriptionWithData({
                  title: salary.categoryName,
                  place: salary.placeName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.salaryDetail_titleInPlaceMetaDescriptionEmpty({
                  title: salary.categoryName,
                  place: salary.placeName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salaryTitleInLocationPath(
                salary.categoryCanonicalSlug,
                salary.locationCanonicalSlug,
              ),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          crossAxisSalaryJsonLd({
            name: salary.categoryName,
            placeName: salary.placeName,
            countryCode: salary.countryCode,
            overall: salary.overallSalary,
            bySeniority: salary.bySeniority,
            currency: salary.currency,
          }),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.titles,
              href: selfUrl(seo.origin, BOARD_PATHS.salaryTitles),
            },
            {
              label: salary.categoryName,
              href: boardUrl(
                seo.origin,
                salaryTitlePath(salary.categoryCanonicalSlug),
              ),
            },
            { label: salary.placeName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, head, jsonLd };
    }),
  );

export const getSkillLocationSalaryPage = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; locationSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [salary, seo] = await Promise.all([
        getBoard().salaries.skills.location(
          data.slug,
          data.locationSlug,
          { locale: getLocale() },
          { headers },
        ),
        seoBase(),
      ]);
      const locale = seo.language;
      const c = breadcrumbsCopy();
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
              salary.overallSalary
                ? salaryEntityInPlaceTitle(
                    locale,
                    salary.skillName,
                    salary.placeName,
                    range!,
                  )
                : m.salaryDetail_skillInPlaceHeading({
                    skill: salary.skillName,
                    place: salary.placeName,
                  }),
            ),
          },
          {
            name: 'description',
            content: salary.overallSalary
              ? m.salaryDetail_skillInPlaceMetaDescriptionWithData({
                  skill: salary.skillName,
                  place: salary.placeName,
                  range: range!,
                  jobCount: salary.overallSalary.jobCount,
                })
              : m.salaryDetail_skillInPlaceMetaDescriptionEmpty({
                  skill: salary.skillName,
                  place: salary.placeName,
                }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(
              seo.origin,
              salarySkillInLocationPath(
                salary.skillCanonicalSlug,
                salary.locationCanonicalSlug,
              ),
            ),
          },
        ],
      };
      const jsonLd = asJsonObjects(
        [
          crossAxisSalaryJsonLd({
            name: salary.skillName,
            placeName: salary.placeName,
            countryCode: salary.countryCode,
            overall: salary.overallSalary,
            bySeniority: salary.bySeniority,
            currency: salary.currency,
          }),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            {
              label: c.salaries,
              href: selfUrl(seo.origin, BOARD_PATHS.salaries),
            },
            {
              label: c.skills,
              href: selfUrl(seo.origin, BOARD_PATHS.salarySkills),
            },
            {
              label: salary.skillName,
              href: boardUrl(
                seo.origin,
                salarySkillPath(salary.skillCanonicalSlug),
              ),
            },
            { label: salary.placeName },
          ]),
        ].filter((entry) => entry !== null),
      );
      return { salary, seo, head, jsonLd };
    }),
  );
