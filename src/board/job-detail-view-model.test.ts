import { describe, expect, it } from 'vitest';

import { toJobDetailVM } from './job-detail-view-model';

import { jobDetailCopy } from '@/copy-groups/job-detail';
import type { PublicBoard, PublicJob, PublicJobCard } from '@cavuno/board';

const copy = jobDetailCopy('en');

/**
 * The mapper is Layer 1b — it's where the correctness-critical derivations
 * live (facts assembly, custom-field boolean resolution, website
 * normalisation, chip hrefs, similar meta). These assertions pin those
 * derivations so a refactor of the presentational layer can never silently
 * change the data the page renders.
 */
const baseJob = {
  id: 'job_1',
  slug: 'senior-engineer',
  title: 'Senior Engineer',
  description: '<p>Build things.</p>',
  publishedAt: null,
  employmentType: 'full_time',
  seniority: 'senior',
  remoteOption: 'remote',
  remoteWorldwide: false,
  remoteWorkPermitCountryCodes: ['US', 'GB'],
  remoteTimezones: [{ value: 'UTC+0' }],
  remoteLocationLabel: null,
  locationLabel: 'Remote',
  placeHierarchy: [],
  salaryMin: 100000,
  salaryMax: 140000,
  salaryCurrency: 'USD',
  salaryTimeframe: 'year',
  experienceMonths: 60,
  educationRequirements: ['bachelors_degree'],
  officeLocations: [
    {
      displayName: null,
      city: 'Berlin',
      locality: null,
      region: 'BE',
      country: 'DE',
    },
  ],
  categories: [{ slug: 'engineering', name: 'Engineering' }],
  skills: [{ slug: 'react', name: 'React' }],
  customFieldValues: { visa: true, team: 'Platform' },
  company: {
    slug: 'acme-co',
    name: 'Acme Co',
    logoUrl: 'https://logo.example/acme.png',
    website: 'acme.example',
    description: 'We build.',
  },
  links: {
    public: 'https://board.example/companies/acme-co/jobs/senior-engineer',
  },
} as unknown as PublicJob;

const customFields = { job: [
  { key: 'visa', label: 'Visa sponsorship', type: 'boolean' },
  { key: 'team', label: 'Team', type: 'short_text' },
] } as unknown as PublicBoard['customFields'];

const similar = [
  {
    id: 'job_2',
    slug: 'staff-engineer',
    title: 'Staff Engineer',
    company: { slug: 'beta-co', name: 'Beta Co', logoUrl: null },
    salaryMin: 150000,
    salaryMax: 200000,
    salaryCurrency: 'USD',
    salaryTimeframe: 'year',
  },
] as unknown as PublicJobCard[];

describe('toJobDetailVM', () => {
  const vm = toJobDetailVM(baseJob, customFields, similar, 'Acme intro.', 'en');

  it('builds chip hrefs from the canonical path helpers', () => {
    expect(vm.categoryChips).toEqual([
      { key: 'engineering', name: 'Engineering', href: '/jobs/engineering' },
    ]);
    expect(vm.skillChips).toEqual([
      { key: 'react', name: 'React', href: '/jobs/skills/react' },
    ]);
  });

  // The resolves-or-omits contract: when the loader supplies the set of chips
  // the taxonomy resolver accepts, chips outside it are dropped and survivors
  // link via their canonical slug. This is the defensive guard against a board
  // whose facet/tag read model has drifted from its resolve read model — a chip
  // that 404s is worse than an absent chip. An omitted map means "don't filter".

  it('assembles the facts rows (office, permits, timezones, education, experience)', () => {
    const byLabel = Object.fromEntries(vm.facts.map((f) => [f.label, f.value]));
    // Office label falls back to city/region/country when displayName is null.
    expect(Object.values(byLabel)).toContain('Berlin, BE, DE');
    expect(Object.values(byLabel)).toContain('US, GB');
    expect(Object.values(byLabel)).toContain('UTC+0');
    // 60 months → 5 years via copy.experienceYears — assert the experience
    // fact specifically, not a stray '5' anywhere in the facts.
    expect(byLabel[copy.experienceLabel]).toContain('5');
  });

  it('keeps physical location separate from workplace type', () => {
    const onSite = toJobDetailVM(
      {
        ...baseJob,
        remoteOption: 'on_site',
        officeLocations: [],
      } as unknown as PublicJob,
      customFields,
      [],
      null,
      'en',
    );

    expect(onSite.locationLabel).toBeNull();
    expect(onSite.workplaceLabel).toBe('On-site');
    // Remote permit codes resolve to country names (card-mapper parity),
    // not the raw "US, GB".
    expect(vm.locationLabel).toBe('United States, United Kingdom');
    expect(vm.workplaceLabel).toBe('Remote');

    const hybrid = toJobDetailVM(
      {
        ...baseJob,
        remoteOption: 'hybrid',
      } as unknown as PublicJob,
      customFields,
      [],
      null,
      'en',
    );

    expect(hybrid.locationLabel).toBe('Berlin, BE, DE');
    expect(hybrid.workplaceLabel).toBe('Hybrid');
  });

  it('resolves a physical location from placeHierarchy when there is no office, matching the card', () => {
    // on_site job whose location lives in the place taxonomy (no geocoded
    // office) — the list card shows "Austin, Texas, US", so the detail must
    // too, not "Location not specified". placeHierarchy is broad→narrow and
    // the country resolves to its ISO code, like the card's server label.
    const onSite = toJobDetailVM(
      {
        ...baseJob,
        remoteOption: 'on_site',
        officeLocations: [],
        placeHierarchy: [
          { slug: 'united-states', name: 'United States' },
          { slug: 'texas-united-states', name: 'Texas' },
          { slug: 'austin-tx-united-states', name: 'Austin' },
        ],
      } as unknown as PublicJob,
      customFields,
      [],
      null,
      'en',
    );

    expect(onSite.locationLabel).toBe('Austin, Texas, US');
    expect(onSite.workplaceLabel).toBe('On-site');
  });

  it('shows Worldwide for an unconstrained remote job, never "not specified"', () => {
    // A remote job with no worldwide flag AND no permit countries is
    // unconstrained → its scope is Worldwide (the card shows "Worldwide").
    const remoteWorldwide = toJobDetailVM(
      {
        ...baseJob,
        remoteOption: 'remote',
        remoteWorldwide: null,
        remoteWorkPermitCountryCodes: [],
        officeLocations: [],
        placeHierarchy: [],
      } as unknown as PublicJob,
      customFields,
      [],
      null,
      'en',
    );

    expect(remoteWorldwide.locationLabel).toBe(copy.worldwideLabel);
  });

  it('lists the constrained countries for a permit-scoped remote job', () => {
    const remoteConstrained = toJobDetailVM(
      {
        ...baseJob,
        remoteOption: 'remote',
        remoteWorldwide: false,
        remoteWorkPermitCountryCodes: ['US', 'GB'],
      } as unknown as PublicJob,
      customFields,
      [],
      null,
      'en',
    );

    expect(remoteConstrained.locationLabel).toBe(
      'United States, United Kingdom',
    );
  });

  it('resolves a boolean custom field to its yes/no copy, text passes through', () => {
    const visa = vm.customFields.find((f) => f.key === 'visa');
    const team = vm.customFields.find((f) => f.key === 'team');
    expect(visa?.value).not.toBe('true'); // resolved to a yes-copy string
    expect(visa?.value.length).toBeGreaterThan(0);
    expect(team?.value).toBe('Platform');
  });

  it('normalises the company website (adds https, strips protocol for the label) and builds the profile path', () => {
    expect(vm.company?.websiteHref).toBe('https://acme.example');
    expect(vm.company?.websiteLabel).toBe('acme.example');
    expect(vm.company?.href).toBe('/companies/acme-co');
    expect(vm.company?.intro).toBe('Acme intro.');
  });

  it('derives the similar-rail meta as "Company · Salary" with route slugs', () => {
    expect(vm.similar[0].companySlug).toBe('beta-co');
    expect(vm.similar[0].jobSlug).toBe('staff-engineer');
    expect(vm.similar[0].meta).toContain('Beta Co');
    expect(vm.similar[0].meta).toContain('·');
  });

  it('carries the API canonical URL and the raw sanitized description', () => {
    expect(vm.detailHref).toBe('/companies/acme-co/jobs/senior-engineer');
    expect(vm.canonicalUrl).toBe(
      'https://board.example/companies/acme-co/jobs/senior-engineer',
    );
    expect(vm.descriptionHtml).toBe('<p>Build things.</p>');
  });
});
