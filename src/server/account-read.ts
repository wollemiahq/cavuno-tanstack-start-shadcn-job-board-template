/**
 * The `/account` read, split out of `account.ts` so it is only reachable from
 * the `getAccount` server-function handler. Client routes import
 * `account.ts`; a top-level export there would drag the server-only board
 * client into the client bundle.
 */
import { requireVerifiedBoardUserUsing } from './me-verification';

import type { BoardSdk } from '@cavuno/board';

type BoardMe = BoardSdk['me'];

/** The `me` reads the `/account` read makes. */
export type AccountBoard = {
  me: Pick<BoardMe, 'retrieve'> & {
    profile: Pick<
      BoardMe['profile'],
      | 'retrieve'
      | 'listExperience'
      | 'listEducation'
      | 'listSkills'
      | 'listLanguages'
      | 'retrieveCustomFields'
      | 'retrieveObjectReferences'
    >;
    savedJobs: Pick<BoardMe['savedJobs'], 'list'>;
    resume: Pick<BoardMe['resume'], 'retrieve'>;
  };
};

/**
 * Everything `/account` renders, by role (hosted parity: the page serves both).
 * A candidate gets the full profile editor's data, fetched in parallel. An
 * employer-only board user has no candidate profile, so they get the employer
 * profile view — the board user plus the profile singleton for its display
 * name and avatar — and none of the candidate `/me/profile/*` detail reads.
 */
export async function readAccount(
  board: AccountBoard,
  headers: Record<string, string>,
) {
  const me = await requireVerifiedBoardUserUsing(
    (requestHeaders) =>
      board.me.retrieve(undefined, { headers: requestHeaders }),
    headers,
  );
  if (me.role === 'employer') {
    const profile = await board.me.profile.retrieve(undefined, { headers });
    return { role: 'employer' as const, me, profile };
  }
  const [
    profile,
    experience,
    education,
    skills,
    languages,
    savedJobs,
    resume,
    customFields,
    objectReferences,
  ] = await Promise.all([
    board.me.profile.retrieve(undefined, { headers }),
    board.me.profile.listExperience({ headers }),
    board.me.profile.listEducation({ headers }),
    board.me.profile.listSkills({ headers }),
    board.me.profile.listLanguages({ headers }),
    board.me.savedJobs.list({ limit: 50 }, { headers }),
    board.me.resume.retrieve({ headers }),
    // Owner-editable custom fields and collection selections (including
    // private fields the public form layout never lists). Each degrades
    // to `null` so an API without them still renders the profile.
    board.me.profile.retrieveCustomFields({ headers }).catch(() => null),
    board.me.profile.retrieveObjectReferences({ headers }).catch(() => null),
  ]);
  return {
    role: 'candidate' as const,
    me,
    profile,
    experience,
    education,
    skills,
    languages,
    savedJobs,
    resume,
    customFields,
    objectReferences,
  };
}

/** The `/account` data: the candidate editor's, or the employer view's. */
export type AccountData = Awaited<ReturnType<typeof readAccount>>;
