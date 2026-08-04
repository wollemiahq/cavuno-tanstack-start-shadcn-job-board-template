import { describe, expect, it } from 'vitest';

import { toJobCardVM, toSavedJobCardVM } from './job-view-model';

import { enumLabel } from '@/lib/enum-labels';
import { cardLocationLabel } from '@/lib/location-labels';
import { formatJobSalary } from '@/lib/salary-display';
import type { PublicJobCard } from '@cavuno/board';

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
  });

  // Delegation-style: expectations CALL the same SDK formatters the
  // mapper delegates to, instead of hard-coding their output. The SDK's
  // own goldens pin the formatted shape; these pin only the wiring, so
  // an SDK formatting change (or an intentional presentation change)
  // breaks nothing here.
  it('delegates salary + compLine to the SDK formatters', () => {
    const expectedSalary = formatJobSalary('en', 100000, 140000, 'year', 'USD');
    expect(vm.salaryLabel).toBe(expectedSalary);
    expect(vm.compLine).toBe(
      [expectedSalary, cardLocationLabel(baseJob)].join(' · '),
    );
  });

  it('exposes the raw wire salary values for component-level re-presentation', () => {
    expect(vm.salaryMin).toBe(100000);
    expect(vm.salaryMax).toBe(140000);
    expect(vm.salaryCurrency).toBe('USD');
    expect(vm.salaryTimeframe).toBe('year');
    expect(vm.publishedAt).toBeNull();
  });

  it('composes locationLabel from the place label and the SDK workplace label', () => {
    expect(vm.locationLabel).toBe(`Worldwide (${enumLabel('remote')})`);
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
      `Location not specified (${enumLabel('on_site')})`,
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

  it('carries the featured flag + resolved label', () => {
    expect(vm.isFeatured).toBe(true);
    expect(vm.featuredLabel.length).toBeGreaterThan(0);
    expect(vm.companyAvatarName).toBe('Acme Co');
  });

  it('marks a company-less job as unlinkable', () => {
    const noCompany = toJobCardVM(
      { ...baseJob, company: null } as unknown as PublicJobCard,
      'en',
    );
    expect(noCompany.detailHref).toBeNull();
    expect(noCompany.companyAvatarName).toBe('Senior Engineer');
  });
});

describe('toSavedJobCardVM', () => {
  // me/saved-jobs embeds a PublicJobCard. Categories / skills can still be
  // absent on a partial fixture — the mapper defaults them so one stale row
  // never takes down /account/saved.
  const slimSavedJob = {
    id: 'job_2',
    object: 'job_card',
    slug: 'staff-engineer',
    title: 'Staff Engineer',
    publishedAt: null,
    employmentType: 'full_time',
    remoteOption: 'remote',
    remoteWorldwide: true,
    remoteLocationLabel: null,
    locationLabel: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    company: { slug: 'acme-co', name: 'Acme Co', logoUrl: null },
    categories: undefined,
    skills: undefined,
    links: {
      public: 'https://board.example/companies/acme-co/jobs/staff-engineer',
    },
  } as unknown as PublicJobCard;

  it('maps the slim saved-list card embed without requiring full-job fields', () => {
    const vm = toSavedJobCardVM(slimSavedJob, 'en');

    expect(vm).not.toBeNull();
    expect(vm?.title).toBe('Staff Engineer');
    expect(vm?.jobSlug).toBe('staff-engineer');
    expect(vm?.detailHref).toBe('/companies/acme-co/jobs/staff-engineer');
    expect(vm?.tags).toEqual([]);
  });

  it('returns null instead of throwing when a row cannot map at all', () => {
    expect(toSavedJobCardVM(undefined, 'en')).toBeNull();
  });
});
