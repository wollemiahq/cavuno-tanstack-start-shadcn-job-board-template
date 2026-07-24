import {
  cardLocationLabel,
  fieldLabel,
  formatSalaryRange,
} from '@cavuno/board/format';
import { describe, expect, it } from 'vitest';

import {
  collectCardTaxonomyCandidates,
  toJobCardVM,
  toSavedJobCardVM,
} from './job-view-model';

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
  });

  // Delegation-style: expectations CALL the same SDK formatters the
  // mapper delegates to, instead of hard-coding their output. The SDK's
  // own goldens pin the formatted shape; these pin only the wiring, so
  // an SDK formatting change (or an intentional presentation change)
  // breaks nothing here.
  it('delegates salary + compLine to the SDK formatters', () => {
    const expectedSalary = formatSalaryRange(
      'en',
      100000,
      140000,
      'year',
      'USD',
    );
    expect(vm.salaryLabel).toBe(expectedSalary);
    expect(vm.compLine).toBe(
      [expectedSalary, cardLocationLabel('en', baseJob)].join(' · '),
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
    expect(vm.locationLabel).toBe(`Worldwide (${fieldLabel('en', 'remote')})`);
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
      `Location not specified (${fieldLabel('en', 'on_site')})`,
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

  // The resolves-or-omits contract for card pills — identical semantics to the
  // detail VM. A tag whose slug the taxonomy resolver rejects would link to a
  // `/jobs/:slug` that 404s (facet/tag read-model drift), so when the loader
  // supplies the resolvable map, non-resolving pills are dropped and survivors
  // link via their canonical slug. An omitted map means "don't filter".
  it('omits card tag pills whose slug does not resolve, canonicalising the rest', () => {
    const twoTagJob = {
      ...baseJob,
      categories: [
        { slug: 'engineering', name: 'Engineering' },
        { slug: 'developer-relations', name: 'Developer Relations' },
      ],
      skills: [
        { slug: 'react', name: 'React' },
        { slug: 'sql', name: 'SQL' },
      ],
    } as unknown as PublicJobCard;

    const filtered = toJobCardVM(twoTagJob, 'en', undefined, {
      'category:developer-relations': 'developer-relations-canonical',
      'skill:sql': 'sql',
    });

    expect(filtered.tags).toEqual([
      {
        key: 'c-developer-relations-canonical',
        name: 'Developer Relations',
        href: '/jobs/developer-relations-canonical',
      },
      { key: 's-sql', name: 'SQL', href: '/jobs/skills/sql' },
    ]);
  });

  it('renders no card tag pills when nothing resolves (empty map)', () => {
    const none = toJobCardVM(baseJob, 'en', undefined, {});
    expect(none.tags).toEqual([]);
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

describe('collectCardTaxonomyCandidates', () => {
  it('dedupes the tag slug union across a page of cards, one entry per type+slug', () => {
    const cards = [
      {
        categories: [{ slug: 'engineering', name: 'Engineering' }],
        skills: [{ slug: 'react', name: 'React' }],
      },
      {
        // engineering repeats (dropped); data + typescript are new.
        categories: [
          { slug: 'engineering', name: 'Engineering' },
          { slug: 'data', name: 'Data' },
        ],
        skills: [{ slug: 'typescript', name: 'TypeScript' }],
      },
    ] as unknown as PublicJobCard[];

    expect(collectCardTaxonomyCandidates(cards)).toEqual([
      { type: 'category', slug: 'engineering' },
      { type: 'skill', slug: 'react' },
      { type: 'category', slug: 'data' },
      { type: 'skill', slug: 'typescript' },
    ]);
  });

  it('returns an empty candidate set for a page with no cards', () => {
    expect(collectCardTaxonomyCandidates([])).toEqual([]);
  });
});

describe('toSavedJobCardVM', () => {
  // The saved-jobs list embeds a SLIMMER job projection than the PublicJob
  // type promises: officeLocations / categories / skills can be absent on the
  // wire. That shape crashed the SDK's fullJobToCard (`officeLocations[0]`)
  // and took the whole /account/saved page down.
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
