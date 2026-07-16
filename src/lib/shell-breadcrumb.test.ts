import { describe, expect, it } from 'vitest';

import {
  resolveShellBreadcrumb,
  resolveShellBreadcrumbEntities,
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

  it('does not add public breadcrumbs to private or embedded application routes', () => {
    for (const pathname of [
      '/account',
      '/auth/sign-in',
      '/employers/dashboard',
      '/messages',
      '/settings',
      '/embed/jobs',
    ]) {
      expect(resolveShellBreadcrumb({ pathname, labels })).toBeNull();
    }
  });
});
