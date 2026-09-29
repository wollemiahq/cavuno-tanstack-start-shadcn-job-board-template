/**
 * The `/matches` read, kept out of `account.ts` (which client routes import)
 * so it is only reachable from the `getRecommendedJobs` server-function
 * handler.
 */
import { throwCandidatePaywallSignal } from '../lib/candidate-paywall-error';
import { requireVerifiedBoardUserUsing } from './me-verification';

import type { BoardSdk } from '@cavuno/board';

type BoardMe = BoardSdk['me'];

/** The `me` reads the `/matches` read makes. */
export type RecommendedJobsBoard = {
  me: Pick<BoardMe, 'retrieve'> & {
    recommendedJobs: Pick<BoardMe['recommendedJobs'], 'list'>;
    profile: Pick<BoardMe['profile'], 'listSkills'>;
    resume: Pick<BoardMe['resume'], 'retrieve'>;
  };
};

/**
 * Job matches come from a candidate profile. An employer-only board user has
 * none, so they get the employer state instead of a resume prompt the API
 * would refuse, and none of the candidate reads.
 */
export async function readRecommendedJobs(
  board: RecommendedJobsBoard,
  headers: Record<string, string>,
) {
  const me = await requireVerifiedBoardUserUsing(
    (requestHeaders) =>
      board.me.retrieve(undefined, { headers: requestHeaders }),
    headers,
  );
  if (me.role === 'employer') return { employerOnly: true as const };
  // Job-seeker plan entitlements are per plan and are NOT on the wire, so
  // there is nothing to pre-gate on: make the call, and translate the
  // board's 403 into a signal that survives this function's boundary.
  const [recommended, skills, resume] = await Promise.all([
    board.me.recommendedJobs
      .list({ limit: 20 }, { headers })
      .catch(throwCandidatePaywallSignal),
    board.me.profile.listSkills({ headers }),
    board.me.resume.retrieve({ headers }),
  ]);
  return {
    employerOnly: false as const,
    ...recommended,
    data: recommended.data.filter((item) => item.job != null),
    skillCount: skills.data.length,
    parseStatus: resume.parseStatus,
    resume,
  };
}
