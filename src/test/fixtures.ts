/**
 * VM fixture factories for component tests.
 *
 * Doctrine (AGENTS.md "Tests assert structure, never formatted values"):
 * component tests render from VM fixtures whose values are deliberately
 * NOT formatter-shaped — no `$120k`, no `5d ago`, no locale output.
 * Formatted values are pinned once, by the SDK's goldens; mapper tests
 * (src/board/*.test.ts) pin composition by CALLING the same formatters.
 * Assertions in component tests reference these fields symbolically
 * (`vm.salaryLabel`), so restyling or re-presenting a value never
 * requires touching a component test.
 */
import type { JobCardVM } from '@/board/job-view-model';

export function makeJobCardVM(overrides: Partial<JobCardVM> = {}): JobCardVM {
  return {
    id: 'j1',
    title: 'Staff Platform Engineer',
    companySlug: null,
    jobSlug: null,
    detailHref: null,
    hasDetailLink: false,
    companyName: 'Acme',
    companyLogoUrl: null,
    companyAvatarName: 'Acme',
    sector: 'Engineering',
    compLine: 'pay line · place line',
    salaryLabel: 'pay line',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    publishedAt: null,
    locationLabel: 'place line',
    summary: 'Own the deploy platform end to end.',
    isFeatured: false,
    featuredLabel: 'Featured',
    postedAtLabel: null,
    tags: [],
    ...overrides,
  };
}
