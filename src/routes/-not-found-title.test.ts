/**
 * A route whose loader throws `notFound()` still runs its own `head()` — the
 * match is real, only its data is missing. Nothing stops that head from
 * titling the 404 with the page it failed to render, and `/talent` did
 * exactly that on a board with no talent directory: the API 404s, the loader
 * throws, and the 404 went out as `<title>Talent</title>`, advertising a page
 * that does not exist.
 *
 * The board name cannot rescue it — a 404 has no loader data, and a child's
 * head cannot read the root's (the root match is still pending). So the
 * honest title is the bare not-found copy, which is what these lock.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

// These routes reach the server layer, which imports `cloudflare:workers`.
// The heads under test never call it — only the module graph needs it gone.
vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn(),
  listTalent: vi.fn(),
  getBoardContext: vi.fn(),
}));
vi.mock('../server/talent-pages', () => ({
  getTalentIndexPage: vi.fn(),
  getTalentProfilePage: vi.fn(),
}));
vi.mock('../server/marketing-pages', () => ({
  getAuthJoinSeo: vi.fn(),
  getEmployersPage: vi.fn(),
}));
// auth.join's already-authed guard imports the account server layer.
vi.mock('../server/account', () => ({ getSessionUser: vi.fn() }));
vi.mock('../server/auth', () => ({
  confirmEmailChange: vi.fn(),
  forgotPassword: vi.fn(),
}));
vi.mock('../server/employers', () => ({
  getCompanyWorkspace: vi.fn(),
  listCompanyMembers: vi.fn(),
  listCompanyInvites: vi.fn(),
  acceptCompanyInvite: vi.fn(),
}));

import { m } from '../paraglide/messages';
import { Route as JoinRoute } from './auth.join';
import { Route as TalentRoute } from './talent.index';

const titleOf = (head: unknown, match: { status: string }) => {
  if (typeof head !== 'function') throw new Error('route defines no head');
  const result = head({ loaderData: undefined, match }) as {
    meta?: Array<{ title?: string }>;
  };
  return result.meta?.find((entry) => entry.title !== undefined)?.title;
};

describe('a 404 does not inherit the failed route’s title', () => {
  it.each([
    ['/talent', TalentRoute],
    ['/auth/join', JoinRoute],
  ])('%s titles the not-found match as not found', (_path, route) => {
    expect(titleOf(route.options.head, { status: 'notFound' })).toBe(
      m.notFound_heading(),
    );
  });

  it('still titles a pending match with the page itself, not "not found"', () => {
    // The same no-loader-data branch serves a pending render; flashing
    // "Page not found" while a page loads would be its own lie.
    expect(titleOf(TalentRoute.options.head, { status: 'pending' })).toBe(
      m.talentDirectory_title(),
    );
  });
});
