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
import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { Route as JoinRoute } from './auth.join';
import { Route as TalentRoute } from './talent.index';

async function titleOf(
  result: ReturnType<NonNullable<typeof TalentRoute.options.head>>,
) {
  const descriptor = await result;
  return descriptor.meta?.find((entry) => entry?.title !== undefined)?.title;
}

function talentTitle(status: 'notFound' | 'pending') {
  const head = TalentRoute.options.head;
  if (!head) throw new Error('route defines no head');
  const match = {
    id: '/talent/',
    routeId: '/talent/',
    fullPath: '/talent/',
    index: 1,
    pathname: '/talent',
    params: {},
    _strictParams: {},
    status,
    isFetching: false,
    error: null,
    paramsError: null,
    searchError: null,
    updatedAt: Date.now(),
    _nonReactive: {},
    loaderData: undefined,
    context: { origin: 'https://board.example' },
    search: {},
    _strictSearch: {},
    fetchCount: 1,
    abortController: new AbortController(),
    cause: 'enter',
    loaderDeps: {},
    preload: false,
    invalid: false,
    staticData: { fullBleed: false, ownsMain: true },
  } satisfies Parameters<typeof head>[0]['match'];
  return titleOf(
    head({ loaderData: undefined, match, matches: [match], params: {} }),
  );
}

function joinTitle() {
  const head = JoinRoute.options.head;
  if (!head) throw new Error('route defines no head');
  const match = {
    id: '/auth/join',
    routeId: '/auth/join',
    fullPath: '/auth/join',
    index: 1,
    pathname: '/auth/join',
    params: {},
    _strictParams: {},
    status: 'notFound',
    isFetching: false,
    error: null,
    paramsError: null,
    searchError: null,
    updatedAt: Date.now(),
    _nonReactive: {},
    loaderData: undefined,
    context: { origin: 'https://board.example' },
    search: {},
    _strictSearch: {},
    fetchCount: 1,
    abortController: new AbortController(),
    cause: 'enter',
    loaderDeps: {},
    preload: false,
    invalid: false,
    staticData: { fullBleed: false, ownsMain: false },
  } satisfies Parameters<typeof head>[0]['match'];
  return titleOf(
    head({ loaderData: undefined, match, matches: [match], params: {} }),
  );
}

describe('a 404 does not inherit the failed route’s title', () => {
  it.each([
    ['/talent', () => talentTitle('notFound')],
    ['/auth/join', joinTitle],
  ])('%s titles the not-found match as not found', async (_path, getTitle) => {
    await expect(getTitle()).resolves.toBe(m.notFound_heading());
  });

  it('still titles a pending match with the page itself, not "not found"', async () => {
    // The same no-loader-data branch serves a pending render; flashing
    // "Page not found" while a page loads would be its own lie.
    await expect(talentTitle('pending')).resolves.toBe(
      m.talentDirectory_title(),
    );
  });
});
