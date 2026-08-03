import { BOARD_PATHS, boardUrl } from '@cavuno/board/paths';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { gatedRead } from './board-access';

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
      const [companies, titles, skills, locations, boardContext] =
        await Promise.all([
          board.salaries.companies.list({ headers }),
          board.salaries.titles.list({ locale }, { headers }),
          board.salaries.skills.list({ locale }, { headers }),
          board.salaries.locations.list({ locale }, { headers }),
          board.context(),
        ]);
      const origin = new URL(getRequest().url).origin;
      const seo = {
        boardName: boardContext.name,
        language: boardContext.language,
        labels: boardContext.labels,
        origin,
      };

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
        head: {
          meta: [
            {
              title: headTitle(boardContext.name, m.salaryHub_metaTitle()),
            },
            {
              name: 'description',
              content: m.salaryHub_metaDescription({
                boardName: boardContext.name,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(origin, BOARD_PATHS.salaries),
            },
          ],
        },
      };
    }),
  );
