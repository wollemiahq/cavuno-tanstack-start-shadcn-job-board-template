import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { Route as StripeBackRoute } from './employer.$slug.jobs.new';
import { Route as InviteAliasRoute } from './employer.invites.accept';

function location(pathname: string, searchStr: string) {
  return {
    href: `${pathname}${searchStr}`,
    pathname,
    search: {},
    searchStr,
    state: { __TSR_index: 0 },
    hash: '',
    publicHref: `${pathname}${searchStr}`,
    external: false,
  };
}

function runInviteBeforeLoad(pathname: string, searchStr: string) {
  const beforeLoad = InviteAliasRoute.options.beforeLoad;
  if (!beforeLoad) throw new Error('invite alias needs beforeLoad');
  try {
    return beforeLoad({
      abortController: new AbortController(),
      preload: false,
      params: {},
      search: {},
      context: { origin: 'https://careers.acme.test' },
      location: location(pathname, searchStr),
      navigate: () => {
        throw new Error('alias beforeLoad must redirect declaratively');
      },
      buildLocation: () => {
        throw new Error('alias beforeLoad must not build a location');
      },
      cause: 'enter',
      matches: [],
      routeId: '/employer/invites/accept',
    });
  } catch (error) {
    return error;
  }
}

function runStripeBackBeforeLoad(pathname: string, searchStr: string) {
  const beforeLoad = StripeBackRoute.options.beforeLoad;
  if (!beforeLoad) throw new Error('stripe-back alias needs beforeLoad');
  const slug = pathname.split('/')[2] ?? '';
  try {
    return beforeLoad({
      abortController: new AbortController(),
      preload: false,
      params: { slug },
      search: {},
      context: { origin: 'https://careers.acme.test' },
      location: location(pathname, searchStr),
      navigate: () => {
        throw new Error('alias beforeLoad must redirect declaratively');
      },
      buildLocation: () => {
        throw new Error('alias beforeLoad must not build a location');
      },
      cause: 'enter',
      matches: [],
      routeId: '/employer/$slug/jobs/new',
    });
  } catch (error) {
    return error;
  }
}

describe('/employer singular aliases', () => {
  it('308s invite accept onto /employers/invites/accept with the token', () => {
    const result = runInviteBeforeLoad(
      '/employer/invites/accept',
      '?token=tok-1',
    );
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      href: '/employers/invites/accept?token=tok-1',
      statusCode: 308,
    });
  });

  it('308s Stripe back onto /employers/companies/{slug}/jobs/new', () => {
    const result = runStripeBackBeforeLoad(
      '/employer/cjj-starter-r3-co/jobs/new',
      '',
    );
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options).toMatchObject({
      href: '/employers/companies/cjj-starter-r3-co/jobs/new',
      statusCode: 308,
    });
  });
});
