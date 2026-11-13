import { BoardApiError } from '@cavuno/board';
import { jobDetailPath } from '@cavuno/board/paths';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { baseLocale } from '../../paraglide/runtime';
import { escapeInline } from './format';
import { buildJobTwin, type JobTwinDependencies } from './job-detail';

import type { PublicJob, PublicJobCard } from '@cavuno/board';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/companies/acme-co/jobs/engineer';

const getJobDetailPage = vi.fn<JobTwinDependencies['getJobDetailPage']>();
const getSimilarJobs = vi.fn<JobTwinDependencies['getSimilarJobs']>();
const resolveRedirect = vi.fn<JobTwinDependencies['resolveRedirect']>();
const readBoardContext = vi.fn<JobTwinDependencies['readBoardContext']>();
const dependencies = {
  getJobDetailPage,
  getSimilarJobs,
  resolveRedirect,
  readBoardContext,
};

function job(overrides: Partial<PublicJob> = {}): PublicJob {
  return {
    id: 'job_1',
    object: 'public_job',
    slug: 'engineer',
    title: 'Engineer <script>',
    status: 'published',
    companyId: 'company_1',
    description:
      '<p>Build <strong>things</strong>.</p><br><br><ul><li>Ship</li></ul>',
    publishedAt: null,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    employmentType: 'full_time',
    customEmploymentType: null,
    seniority: null,
    remoteOption: null,
    remotePermits: [],
    remoteWorldwide: false,
    remoteWorkPermitCountryCodes: [],
    remoteWorkPermitSubdivisionCodes: [],
    remoteTimezones: [],
    remoteAllowedTzOffsets: [],
    remoteSponsorship: 'unknown',
    placeHierarchy: [],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    isSponsored: false,
    applicationUrl: null,
    applyAction: 'native',
    experienceMonths: null,
    experienceInPlaceOfEducation: null,
    educationRequirements: [],
    inOfficePeriod: null,
    inOfficeFrequency: null,
    officeLocations: [],
    categories: [],
    skills: [],
    customFieldValues: {},
    resolvedCollectionFields: [],
    company: {
      id: 'company_1',
      slug: 'acme-co',
      name: 'Acme Co',
      logoUrl: null,
      website: null,
    },
    links: { public: CANONICAL },
    ...overrides,
  };
}

const similarJob: PublicJobCard = {
  id: 'job_2',
  object: 'job_card',
  customFieldValues: {},
  slug: 'designer',
  title: 'Designer',
  company: { slug: 'beta', name: 'Beta', logoUrl: null, customFieldValues: {} },
  publishedAt: null,
  employmentType: 'full_time',
  customEmploymentType: null,
  remoteOption: null,
  remoteLocationLabel: null,
  remoteWorldwide: false,
  remoteWorkPermitCountryCodes: [],
  locationLabel: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryTimeframe: null,
  isFeatured: false,
  isSponsored: false,
  summary: null,
  categories: [],
  skills: [],
  links: { public: null },
  remotePermits: [],
  distanceKm: null,
};

function page(publicJob: PublicJob) {
  return {
    job: publicJob,
    seo: { origin: ORIGIN },
    head: { links: [{ rel: 'canonical', href: CANONICAL }] },
  };
}

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({ method: 'GET', url: `${ORIGIN}${path}` });
  if (!twin) throw new Error(`no twin for ${path}`);
  return twin;
}

const jobPath = localizePath(jobDetailPath('acme-co', 'engineer'));
const notFound = new BoardApiError({
  status: 404,
  code: 'jobs_not_found',
  message: 'Not found',
  raw: undefined,
});

beforeEach(() => {
  getJobDetailPage.mockReset();
  getSimilarJobs.mockReset();
  resolveRedirect.mockReset();
  getSimilarJobs.mockResolvedValue({ data: [] });
  resolveRedirect.mockResolvedValue({ target: null });
  readBoardContext.mockResolvedValue({
    language: baseLocale,
    customFields: { job: [], jobCollections: [] },
  });
});

describe('buildJobTwin', () => {
  it('builds the twin from the page server function', async () => {
    getJobDetailPage.mockResolvedValue(page(job()));
    const result = await buildJobTwin(
      twinFor(`${jobPath}.md`),
      ORIGIN,
      dependencies,
    );

    expect(getJobDetailPage).toHaveBeenCalledWith({
      data: { jobSlug: 'engineer' },
    });
    expect(result.type).toBe('markdown');
    if (result.type !== 'markdown') return;
    expect(result.canonical).toBe(CANONICAL);
    const heading = escapeInline(
      m.jobDetailHead_titleAtCompany({
        title: 'Engineer <script>',
        company: 'Acme Co',
      }),
    );
    expect(result.body.startsWith(`# ${heading}\n`)).toBe(true);
    expect(result.body).not.toContain('<script>');
    expect(result.body).toContain('Build **things**.\n\n* Ship');
    expect(result.body).not.toMatch(/\n{3,}/);
    expect(result.body).toContain(
      `[${m.apply_applyButtonText()}](${ORIGIN}${jobPath})`,
    );
    expect(result.body).not.toContain(m.jobDetail_similarJobsHeading());
  });

  it('lists similar jobs by their page URLs', async () => {
    getJobDetailPage.mockResolvedValue(page(job()));
    getSimilarJobs.mockResolvedValue({ data: [similarJob] });
    const result = await buildJobTwin(
      twinFor(`${jobPath}.md`),
      ORIGIN,
      dependencies,
    );

    expect(result.type === 'markdown' && result.body).toContain(
      `## ${m.jobDetail_similarJobsHeading()}\n\n- [Designer](${selfUrl(
        ORIGIN,
        jobDetailPath('beta', 'designer'),
      )}) (Beta)`,
    );
  });

  it('moves a job under the wrong company to its own twin', async () => {
    getJobDetailPage.mockResolvedValue(page(job()));
    const wrong = localizePath(jobDetailPath('other-co', 'engineer'));
    await expect(
      buildJobTwin(twinFor(`${wrong}.md`), ORIGIN, dependencies),
    ).resolves.toEqual({ type: 'redirect', location: `${jobPath}.md` });
  });

  it('404s a missing or closed job, as the page does', async () => {
    getJobDetailPage.mockRejectedValue(notFound);
    await expect(
      buildJobTwin(twinFor(`${jobPath}.md`), ORIGIN, dependencies),
    ).resolves.toEqual({ type: 'notFound' });
    expect(resolveRedirect).toHaveBeenCalledWith({ data: { path: jobPath } });
  });

  it('follows a configured redirect to the target twin', async () => {
    getJobDetailPage.mockRejectedValue(notFound);
    const target = localizePath(jobDetailPath('acme-co', 'engineer-2'));
    resolveRedirect.mockResolvedValue({ target });
    await expect(
      buildJobTwin(twinFor(`${jobPath}.md`), ORIGIN, dependencies),
    ).resolves.toEqual({ type: 'redirect', location: `${target}.md` });
  });

  it('lets a Board API outage through', async () => {
    const outage = new BoardApiError({
      status: 503,
      code: 'unknown_error',
      message: 'Unavailable',
      raw: undefined,
    });
    getJobDetailPage.mockRejectedValue(outage);
    await expect(
      buildJobTwin(twinFor(`${jobPath}.md`), ORIGIN, dependencies),
    ).rejects.toBe(outage);
  });
});
