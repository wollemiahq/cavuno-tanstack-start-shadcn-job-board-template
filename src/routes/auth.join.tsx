import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import {
  candidateReturnTo,
  candidateSignUpHref,
} from '../lib/candidate-return-to';
import { resolveSignupDestination } from '../lib/signup-destination';
import { m } from '../paraglide/messages';
import { getAuthJoinSeo } from '../server/marketing-pages';
import { getBoardContext } from '../server/queries';
import { JoinPage, JoinUnavailable } from './-auth.join';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/auth/join')({
  // The key is omitted rather than set to `undefined` when absent, so a
  // `search={{}}` link stays a clean `/auth/join` with no trailing `?`.
  validateSearch: (search: UrlSearchInput): { returnTo?: string } =>
    searchString(search.returnTo)
      ? { returnTo: candidateReturnTo(search.returnTo) }
      : {},
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // One wave: the session probe, the board context and the join SEO are
    // mutually independent. A board that gates or redirects away discards the
    // SEO it fetched — rare, and cheaper than serializing three round trips
    // on every visit to a signup entry page.
    const [user, board, joinSeo] = await Promise.all([
      sessionUserOrNull(),
      getBoardContext(),
      getAuthJoinSeo(),
    ]);
    redirectIfSignedIn(user, candidateReturnTo(deps.returnTo));
    const destination = resolveSignupDestination(board.features);
    if (destination === null) throw notFound();
    if (destination !== '/auth/join') {
      // Carry the caller's destination through the gate. Only the candidate
      // form takes a returnTo; the employer form has no candidate context.
      throw redirect({
        href:
          destination === '/auth/sign-up'
            ? candidateSignUpHref(deps.returnTo)
            : destination,
      });
    }
    return { boardName: board.name, ...joinSeo };
  },
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {
          meta: [
            {
              // A board with signup disabled throws notFound() here, and the
              // head still runs — so without this the 404 would advertise a
              // join page that does not exist.
              title:
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.authJoin_title(),
            },
          ],
        },
  component: JoinPage,
  notFoundComponent: JoinUnavailable,
});
