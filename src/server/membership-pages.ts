/**
 * Route-family-owned server boundary for `/memberships`.
 *
 * A membership is public identity: the plan says what a member gets, and
 * `companies.list({ membershipPlanId })` says who holds one. Both reads are
 * public, so the page renders for signed-out visitors and crawlers.
 */
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { selfUrl } from '@/lib/self-url';
import type { Plan, PublicCompany } from '@cavuno/board';

/** Roster page size; matches the companies directory. */
export const MEMBERS_PAGE_SIZE = 24;

export interface MembershipRoster {
  planId: string;
  /** Total members on the plan — `count` describes the roster, not the board. */
  count: number;
  companies: PublicCompany[];
}

/**
 * One roster page. Failures degrade to an empty roster: a membership plan must
 * still render its own benefits when the company catalog is unavailable.
 */
async function readRoster(
  planId: string,
  headers: Record<string, string>,
): Promise<MembershipRoster> {
  try {
    const page = await getBoard().companies.list(
      { membershipPlanId: planId, limit: MEMBERS_PAGE_SIZE },
      { headers },
    );
    return {
      planId,
      count: page.count ?? page.data.length,
      companies: page.data,
    };
  } catch {
    return { planId, count: 0, companies: [] };
  }
}

const byDisplayOrder = (a: Plan, b: Plan) =>
  a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);

export const getMembershipsPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [plansEnvelope, boardContext, origin] = await Promise.all([
        getBoard().plans.list({ purpose: 'membership' }, { headers }),
        readBoardContext(),
        readPublicOrigin(),
      ]);
      const plans = [...plansEnvelope.data].sort(byDisplayOrder);
      const seo = {
        boardName: boardContext.name,
        contactEmail: boardContext.contact?.email ?? null,
      };
      // A board with no published membership plan has no memberships page —
      // the route turns this into a real 404 rather than an empty shell.
      if (plans.length === 0) return { plans, rosters: [], seo, head: null };

      const rosters = await Promise.all(
        plans.map((plan) => readRoster(plan.id, headers)),
      );
      const canonical = selfUrl(origin, '/memberships');
      const title = headTitle(seo.boardName, m.memberships_title());
      const description = m.memberships_metaDescription({
        boardName: seo.boardName,
      });
      return {
        plans,
        rosters,
        seo,
        head: {
          meta: [
            { title },
            { name: 'description', content: description },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:type', content: 'website' },
            { property: 'og:url', content: canonical },
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
      };
    }),
  );

/** A further roster page for one plan — the "show more members" read. */
export const listMembershipCompanies = createServerFn({ method: 'GET' })
  .validator((input: { planId: string; offset: number }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const page = await getBoard().companies.list(
        {
          membershipPlanId: data.planId,
          limit: MEMBERS_PAGE_SIZE,
          offset: data.offset,
        },
        { headers },
      );
      return {
        planId: data.planId,
        count: page.count ?? page.data.length,
        companies: page.data,
      } satisfies MembershipRoster;
    }),
  );
