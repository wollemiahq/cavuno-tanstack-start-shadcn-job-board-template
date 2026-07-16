import { describe, expect, it } from 'vitest';

import { toJobCardVM, toSavedJobCardVM } from './job-view-model';

import type { PublicJob, PublicJobCard } from '@cavuno/board';

/**
 * The card mapper is Layer 1b — it owns the derivations (compLine, honest
 * summary, chip hrefs, featured label, detail-link slugs). These pin them
 * so the pure-markup cards can be restyled without changing the data.
 */
const baseJob = {
  id: 'job_1',
  slug: 'senior-engineer',
  title: 'Senior Engineer',
  description: '<p>Build great things for the team.</p>',
  publishedAt: null,
  employmentType: 'full_time',
  remoteOption: 'remote',
  remoteLocationLabel: 'Worldwide',
  locationLabel: 'Remote',
  salaryMin: 100000,
  salaryMax: 140000,
  salaryCurrency: 'USD',
  salaryTimeframe: 'year',
  isFeatured: true,
  company: { slug: 'acme-co', name: 'Acme Co', logoUrl: null },
  categories: [{ slug: 'engineering', name: 'Engineering' }],
  skills: [{ slug: 'react', name: 'React' }],
} as unknown as PublicJobCard;

describe('toJobCardVM', () => {
  const vm = toJobCardVM(baseJob, 'en');

  it('exposes the detail-route slugs for the typed link', () => {
    expect(vm.companySlug).toBe('acme-co');
    expect(vm.jobSlug).toBe('senior-engineer');
    expect(vm.detailHref).toBe('/companies/acme-co/jobs/senior-engineer');
    expect(vm.hasDetailLink).toBe(true);
  });

  it('keeps salary and essential location metadata independently renderable', () => {
    expect(vm.compLine).toContain('·');
    expect(vm.compLine).toMatch(/\$/);
    expect(vm.salaryLabel).toMatch(/\$/);
    expect(vm.locationLabel).toBe('Worldwide (Remote)');
  });

  it('states when an on-site card is missing its physical location', () => {
    const missingLocation = toJobCardVM(
      {
        ...baseJob,
        remoteOption: 'on_site',
        remoteLocationLabel: null,
        locationLabel: null,
      } as unknown as PublicJobCard,
      'en',
    );

    expect(missingLocation.locationLabel).toBe(
      'Location not specified (On-site)',
    );
  });

  it('derives an honest summary from the description', () => {
    expect(vm.summary).toContain('Build great things');
  });

  it('builds chip hrefs from the canonical path helpers (categories then skills)', () => {
    expect(vm.tags).toEqual([
      { key: 'c-engineering', name: 'Engineering', href: '/jobs/engineering' },
      { key: 's-react', name: 'React', href: '/jobs/skills/react' },
    ]);
  });

  it('carries the featured flag + resolved label and the sector', () => {
    expect(vm.isFeatured).toBe(true);
    expect(vm.featuredLabel.length).toBeGreaterThan(0);
    expect(vm.sector).toBe('Engineering');
    expect(vm.companyAvatarName).toBe('Acme Co');
  });

  it('marks a company-less job as unlinkable', () => {
    const noCompany = toJobCardVM(
      { ...baseJob, company: null } as unknown as PublicJobCard,
      'en',
    );
    expect(noCompany.hasDetailLink).toBe(false);
    expect(noCompany.detailHref).toBeNull();
    expect(noCompany.companyAvatarName).toBe('Senior Engineer');
  });
});

describe('toSavedJobCardVM', () => {
  // The saved-jobs list embeds a SLIMMER job projection than the PublicJob
  // type promises: officeLocations / categories / skills can be absent on the
  // wire. That shape crashed the SDK's fullJobToCard (`officeLocations[0]`)
  // and took the whole /account/saved page down (CAV-510 regression).
  const slimSavedJob = {
    id: 'job_2',
    slug: 'staff-engineer',
    title: 'Staff Engineer',
    publishedAt: null,
    employmentType: 'full_time',
    remoteOption: 'remote',
    remoteWorldwide: true,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    company: { slug: 'acme-co', name: 'Acme Co', logoUrl: null },
    links: {
      public: 'https://board.example/companies/acme-co/jobs/staff-engineer',
    },
  } as unknown as PublicJob;

  it('maps the slim saved-list embed without the arrays the type promises', () => {
    const vm = toSavedJobCardVM(slimSavedJob, 'en');

    expect(vm).not.toBeNull();
    expect(vm?.title).toBe('Staff Engineer');
    expect(vm?.jobSlug).toBe('staff-engineer');
    expect(vm?.detailHref).toBe('/companies/acme-co/jobs/staff-engineer');
    expect(vm?.tags).toEqual([]);
  });

  it('returns null instead of throwing when a row cannot map at all', () => {
    expect(
      toSavedJobCardVM(undefined as unknown as PublicJob, 'en'),
    ).toBeNull();
  });
});
