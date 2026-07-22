import { describe, expect, it } from 'vitest';

import {
  resolveShellBreadcrumb,
  resolveShellBreadcrumbEntities,
  resolveShellBreadcrumbTrail,
} from './shell-breadcrumb';

const labels = {
  home: 'Home',
  jobs: 'Jobs',
  locations: 'Locations',
  salaries: 'Salaries',
  companies: 'Companies',
  skills: 'Skills',
  titles: 'Titles',
  blog: 'Blog',
  post: 'Post a Job',
  about: 'About',
  impressum: 'Impressum',
  termsOfService: 'Terms of Service',
  privacyPolicy: 'Privacy Policy',
  cookiePolicy: 'Cookie Policy',
  talent: 'Talent',
};

describe('shell breadcrumb resolver', () => {
  it('gives every public top-level page a shell breadcrumb', () => {
    expect(resolveShellBreadcrumb({ pathname: '/blog', labels })).toEqual({
      items: [{ name: 'Home', href: '/' }, { name: 'Blog' }],
    });
    expect(resolveShellBreadcrumb({ pathname: '/', labels })).toEqual({
      items: [{ name: 'Home' }],
    });
  });

  it('builds friendly nested job and company trails from loaded entities', () => {
    expect(
      resolveShellBreadcrumb({
        pathname: '/jobs/locations/shanghai-sh-china/mechanical-engineering',
        labels,
        entities: {
          location: 'Shanghai, China',
          query: 'Mechanical Engineering',
        },
      }),
    ).toEqual({
      items: [
        { name: 'Home', href: '/' },
        { name: 'Jobs', href: '/jobs' },
        { name: 'Locations', href: '/jobs/locations' },
        {
          name: 'Shanghai, China',
          href: '/jobs/locations/shanghai-sh-china',
        },
        { name: 'Mechanical Engineering' },
      ],
    });

    expect(
      resolveShellBreadcrumb({
        pathname: '/companies/anduril/jobs/robotics-engineer',
        labels,
        entities: { company: 'Anduril', job: 'Robotics Engineer' },
      }),
    ).toEqual({
      items: [
        { name: 'Home', href: '/' },
        { name: 'Companies', href: '/companies' },
        { name: 'Anduril', href: '/companies/anduril' },
        { name: 'Jobs', href: '/companies/anduril/jobs' },
        { name: 'Robotics Engineer' },
      ],
    });
  });

  it('uses loaded route data when available and readable slug fallbacks while pending', () => {
    expect(
      resolveShellBreadcrumbEntities([
        {
          loaderData: {
            company: { name: 'Magna International Inc.' },
            job: { title: 'Engineer Mechatronics' },
          },
        },
      ]),
    ).toMatchObject({
      company: 'Magna International Inc.',
      job: 'Engineer Mechatronics',
    });

    expect(
      resolveShellBreadcrumb({
        pathname: '/blog/how-to-build-robots',
        labels,
      }),
    ).toEqual({
      items: [
        { name: 'Home', href: '/' },
        { name: 'Blog', href: '/blog' },
        { name: 'How To Build Robots' },
      ],
    });
  });

  it('authed routes get trails too; only embeds and the password gate stay bare', () => {
    for (const pathname of [
      '/account',
      '/auth/sign-in',
      '/employers/dashboard',
      '/messages',
      '/settings',
    ]) {
      expect(resolveShellBreadcrumb({ pathname, labels })).not.toBeNull();
    }
    expect(resolveShellBreadcrumb({ pathname: '/embed/jobs', labels })).toBeNull();
    expect(resolveShellBreadcrumb({ pathname: '/password', labels })).toBeNull();
  });
});

describe('resolveShellBreadcrumb — authed surfaces (footer trails everywhere)', () => {
  const privateLabels = {
    account: 'Account',
    profile: 'Profile',
    savedJobs: 'Saved jobs',
    jobAlerts: 'Job alerts',
    applications: 'Applications',
    applicants: 'Applicants',
    subscription: 'Subscription',
    settings: 'Settings',
    messages: 'Messages',
    signIn: 'Sign in',
    signUp: 'Sign up',
    postJob: 'Post a job',
    companyProfile: 'Company profile',
    employerDashboard: 'Companies',
  };
  const resolve = (pathname: string, entities = {}) =>
    resolveShellBreadcrumb({ pathname, labels, privateLabels, entities });

  it('candidate pages skip the /me plumbing segment', () => {
    expect(resolve('/me/saved')).toEqual({
      items: [{ name: 'Home', href: '/' }, { name: 'Saved jobs' }],
    });
    expect(resolve('/me/applications')?.items[1]).toEqual({
      name: 'Applications',
    });
  });

  it('settings, messages, and account trails render', () => {
    expect(resolve('/settings')?.items[1]).toEqual({ name: 'Settings' });
    expect(resolve('/messages')?.items[1]).toEqual({ name: 'Messages' });
    expect(resolve('/account/access')?.items).toEqual([
      { name: 'Home', href: '/' },
      { name: 'Account', href: '/account' },
      { name: 'Subscription' },
    ]);
  });

  it('employer company pages use the resolved company name', () => {
    expect(
      resolve('/employers/companies/cinder-oak-robotics/jobs/new', {
        company: 'Cinder & Oak Robotics',
      })?.items,
    ).toEqual([
      { name: 'Home', href: '/' },
      {
        name: 'Cinder & Oak Robotics',
        href: '/employers/companies/cinder-oak-robotics',
      },
      { name: 'Post a job' },
    ]);
  });

  it('applicants pages prefer the job title', () => {
    expect(
      resolve('/employers/companies/acme/jobs/j1/applicants', {
        company: 'Acme',
        job: 'Director of Hardware Engineering',
      })?.items[2],
    ).toEqual({ name: 'Director of Hardware Engineering' });
  });

  it('auth pages get a trail; embeds and the password gate stay bare', () => {
    expect(resolve('/auth/sign-in')?.items[1]).toEqual({ name: 'Sign in' });
    expect(resolve('/embed/jobs')).toBeNull();
    expect(resolve('/password')).toBeNull();
  });

  it('labels fall back to readable segments when not provided', () => {
    expect(
      resolveShellBreadcrumb({ pathname: '/me/saved', labels })?.items[1],
    ).toEqual({ name: 'Saved' });
  });
});

describe('resolveShellBreadcrumb — route-injected trail override', () => {
  it('renders a provided trail verbatim, forcing the last crumb terminal', () => {
    // The salary-location hierarchy: ancestors linked, current place terminal.
    const trail = [
      { name: 'Home', href: '/' },
      { name: 'Salaries', href: '/salaries' },
      { name: 'Locations', href: '/salaries/locations' },
      { name: 'United States', href: '/salaries/locations/united-states' },
      { name: 'Texas', href: '/salaries/locations/texas' },
      // Even a trailing href on the current place is stripped by finish().
      { name: 'Austin', href: '/salaries/locations/austin' },
    ];
    expect(
      resolveShellBreadcrumb({
        pathname: '/salaries/locations/austin',
        labels,
        override: trail,
      }),
    ).toEqual({
      items: [
        { name: 'Home', href: '/' },
        { name: 'Salaries', href: '/salaries' },
        { name: 'Locations', href: '/salaries/locations' },
        { name: 'United States', href: '/salaries/locations/united-states' },
        { name: 'Texas', href: '/salaries/locations/texas' },
        { name: 'Austin' },
      ],
    });
  });

  it('keeps the excluded-prefix gate ahead of any override', () => {
    expect(
      resolveShellBreadcrumb({
        pathname: '/embed/jobs',
        labels,
        override: [{ name: 'Home', href: '/' }, { name: 'X' }],
      }),
    ).toBeNull();
  });

  it('falls back to the path-derived trail when no override is provided', () => {
    // The fan-out path keeps its flat shape from segments alone (no override).
    expect(
      resolveShellBreadcrumb({
        pathname: '/salaries/locations/austin/titles',
        labels,
      })?.items,
    ).toEqual([
      { name: 'Home', href: '/' },
      { name: 'Salaries', href: '/salaries' },
      { name: 'Locations', href: '/salaries/locations' },
      { name: 'Austin', href: '/salaries/locations/austin' },
      { name: 'Titles' },
    ]);
  });
});

describe('resolveShellBreadcrumbTrail', () => {
  it('reads a valid trail from loader data (deepest match wins)', () => {
    expect(
      resolveShellBreadcrumbTrail([
        { loaderData: { salary: {} } },
        {
          loaderData: {
            breadcrumbTrail: [
              { name: 'Home', href: '/' },
              { name: 'Austin' },
            ],
          },
        },
      ]),
    ).toEqual([{ name: 'Home', href: '/' }, { name: 'Austin' }]);
  });

  it('ignores malformed or empty trails so the path fallback runs', () => {
    expect(resolveShellBreadcrumbTrail([{ loaderData: {} }])).toBeNull();
    expect(
      resolveShellBreadcrumbTrail([{ loaderData: { breadcrumbTrail: [] } }]),
    ).toBeNull();
    expect(
      resolveShellBreadcrumbTrail([
        { loaderData: { breadcrumbTrail: [{ name: '' }] } },
      ]),
    ).toBeNull();
    expect(
      resolveShellBreadcrumbTrail([
        { loaderData: { breadcrumbTrail: 'not-an-array' } },
      ]),
    ).toBeNull();
  });
});
