import { describe, expect, it } from 'vitest';

import { publicJobFixture } from '../routes/-route-test-fixtures';
import { jobBreadcrumbItems, jobBreadcrumbJsonLd } from './job-breadcrumbs';

import { localizePath } from '@/lib/localized-path';
import type { PublicJob } from '@cavuno/board';

function job(overrides: Partial<PublicJob> = {}): PublicJob {
  return {
    ...publicJobFixture('senior-engineer'),
    title: 'Senior Engineer',
    categories: [
      {
        slug: 'engineering',
        name: 'Engineering',
        canonicalSlug: 'engineering',
        displayName: 'Engineering',
      },
    ],
    company: {
      id: 'company_1',
      slug: 'acme-co',
      name: 'Acme Co',
      logoUrl: null,
      website: null,
    },
    ...overrides,
  };
}

describe('jobBreadcrumbItems', () => {
  it('is Home > Jobs > places > company > title, with title current', () => {
    expect(
      jobBreadcrumbItems(
        job({
          placeHierarchy: [
            {
              slug: 'united-states',
              name: 'United States',
              canonicalSlug: 'united-states',
            },
            {
              slug: 'texas-united-states',
              name: 'Texas',
              canonicalSlug: 'texas-united-states',
            },
            {
              slug: 'austin-tx-united-states',
              name: 'Austin',
              canonicalSlug: 'austin-tx-united-states',
            },
          ],
        }),
      ),
    ).toEqual([
      { name: expect.any(String), href: '/' },
      { name: expect.any(String), href: '/jobs' },
      { name: 'United States', href: '/jobs/locations/united-states' },
      { name: 'Texas', href: '/jobs/locations/texas-united-states' },
      { name: 'Austin', href: '/jobs/locations/austin-tx-united-states' },
      { name: 'Acme Co', href: '/companies/acme-co' },
      { name: 'Senior Engineer' },
    ]);
  });

  it('links places by canonicalSlug, not the English slug', () => {
    const hrefs = jobBreadcrumbItems(
      job({
        placeHierarchy: [
          {
            slug: 'netherlands',
            name: 'Nederland',
            canonicalSlug: 'nederland',
          },
          {
            slug: 'amsterdam-nh-netherlands',
            name: 'Amsterdam',
            canonicalSlug: 'amsterdam-noord-holland-nederland',
          },
        ],
      }),
    ).map((crumb) => crumb.href);
    expect(hrefs).toContain('/jobs/locations/nederland');
    expect(hrefs).toContain(
      '/jobs/locations/amsterdam-noord-holland-nederland',
    );
    expect(hrefs).not.toContain('/jobs/locations/amsterdam-nh-netherlands');
  });

  it('does not insert the primary category', () => {
    const names = jobBreadcrumbItems(job()).map((crumb) => crumb.name);
    expect(names).toEqual([
      expect.any(String),
      expect.any(String),
      'Acme Co',
      'Senior Engineer',
    ]);
    expect(names).not.toContain('Engineering');
  });

  it('omits the company crumb when the company has no public slug', () => {
    expect(
      jobBreadcrumbItems(
        job({
          company: {
            id: 'company_1',
            slug: null,
            name: 'Acme Co',
            logoUrl: null,
            website: null,
          },
        }),
      ),
    ).toEqual([
      { name: expect.any(String), href: '/' },
      { name: expect.any(String), href: '/jobs' },
      { name: 'Senior Engineer' },
    ]);
  });
});

describe('jobBreadcrumbJsonLd', () => {
  it('mirrors the visible trail with localized paths', () => {
    expect(
      jobBreadcrumbJsonLd(
        job({
          placeHierarchy: [
            { slug: 'berlin', name: 'Berlin', canonicalSlug: 'berlin' },
          ],
        }),
      ),
    ).toEqual([
      { name: expect.any(String), path: '/' },
      { name: expect.any(String), path: localizePath('/jobs') },
      { name: 'Berlin', path: localizePath('/jobs/locations/berlin') },
      { name: 'Acme Co', path: localizePath('/companies/acme-co') },
      { name: 'Senior Engineer' },
    ]);
  });
});
