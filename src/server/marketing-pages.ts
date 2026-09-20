/**
 * Route-family-owned server boundary for employers landing + auth join.
 */
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { selfUrl } from '@/lib/self-url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // SDK SEO builders, then JSON round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

async function seoBase() {
  const [boardContext, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

async function plansPagePayload(
  headers: HeadersInit,
  path: '/employers' | '/job-seekers' | '/pricing',
  title: string,
  description: string,
  breadcrumbLabel: string,
) {
  const board = getBoard();
  const [plans, employerServicePlans, seo] = await Promise.all([
    board.plans.list({}, { headers }),
    board.plans.list({ purpose: 'employer_service' }, { headers }),
    seoBase(),
  ]);
  const head = {
    meta: [
      { title: headTitle(seo.boardName, title) },
      { name: 'description', content: description },
    ],
    links: [{ rel: 'canonical', href: selfUrl(seo.origin, path) }],
  };
  const c = breadcrumbsCopy();
  const jsonLd = asJsonObjects([
    createBreadcrumbJsonLd([
      { label: c.home, href: selfUrl(seo.origin, '/') },
      { label: breadcrumbLabel },
    ]),
  ]);
  return {
    plans: plans.data,
    contactPlans: employerServicePlans.data.filter(
      (plan) => plan.pricingMode === 'contact',
    ),
    seo,
    head,
    jsonLd,
    breadcrumbTrail: [{ name: c.home, href: '/' }, { name: breadcrumbLabel }],
  };
}

export const getEmployersPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [plans, employerServicePlans, seo] = await Promise.all([
        board.plans.list({}, { headers }),
        // `plans.salesLed()` is deprecated: the same tiers come back from the
        // plan list under the `employer_service` purpose, and `pricingMode`
        // (never `price`) is what makes one quote-only.
        board.plans.list({ purpose: 'employer_service' }, { headers }),
        seoBase(),
      ]);
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.employerLanding_title()),
          },
          {
            name: 'description',
            content: m.employerLanding_subtitle({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [{ rel: 'canonical', href: selfUrl(seo.origin, '/employers') }],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: m.breadcrumbJsonLd_forEmployersLabel() },
          ]),
        ].filter((e) => e !== null),
      );
      return {
        plans: plans.data,
        contactPlans: employerServicePlans.data.filter(
          (plan) => plan.pricingMode === 'contact',
        ),
        seo,
        head,
        jsonLd,
      };
    }),
  );

export const getJobSeekersPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (headers) =>
      plansPagePayload(
        headers,
        '/job-seekers',
        m.candidateLanding_title(),
        m.candidateLanding_description(),
        m.candidateLanding_title(),
      ),
    ),
  );

export const getPricingPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (headers) =>
      plansPagePayload(
        headers,
        '/pricing',
        m.pricing_title(),
        m.pricing_description(),
        m.pricing_title(),
      ),
    ),
  );

/**
 * Auth join head payload only — auth guards stay in the route loader
 * (redirectIfAuthenticated / destination resolution).
 */
export const getAuthJoinSeo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const seo = await seoBase();
    const head = {
      meta: [{ title: headTitle(seo.boardName, m.authJoin_title()) }],
      links: [{ rel: 'canonical', href: selfUrl(seo.origin, '/auth/join') }],
    };
    const c = breadcrumbsCopy();
    const jsonLd = asJsonObjects(
      [
        createBreadcrumbJsonLd([
          { label: c.home, href: selfUrl(seo.origin, '/') },
          { label: m.breadcrumbJsonLd_joinLabel() },
        ]),
      ].filter((e) => e !== null),
    );
    return { seo, head, jsonLd };
  },
);
