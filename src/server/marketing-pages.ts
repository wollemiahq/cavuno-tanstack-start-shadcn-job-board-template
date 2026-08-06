/**
 * Route-family-owned server boundary for employers landing + auth join.
 */
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { selfUrl } from '@/lib/self-url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
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

export const getEmployersPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [plans, salesLed, seo] = await Promise.all([
        board.plans.list({}, { headers }),
        board.plans.salesLed({ headers }),
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
        salesLed: salesLed.data,
        seo,
        head,
        jsonLd,
      };
    }),
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
