import { describe, expect, it } from 'vitest';

import { toJobCardVM } from './job-view-model';

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
    expect(vm.hasDetailLink).toBe(true);
  });

  it('builds a "Salary · Location" comp line', () => {
    expect(vm.compLine).toContain('·');
    expect(vm.compLine).toMatch(/\$/);
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
