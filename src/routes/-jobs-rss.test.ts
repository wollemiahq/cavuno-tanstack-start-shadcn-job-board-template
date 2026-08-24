import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createJobsRssHandler,
  type JobsRssBoard,
  type JobsRssDependencies,
} from './-jobs-rss-handler';

import type { PublicJobCard } from '@cavuno/board';

const context = vi.fn<JobsRssBoard['context']>();
const listJobs = vi.fn<JobsRssBoard['jobs']['list']>();
const dependencies: JobsRssDependencies = {
  getRequest: () => new Request('https://board.example/jobs/rss.xml'),
  getBoard: () => ({ context, jobs: { list: listJobs } }),
};
const getRssResponse = createJobsRssHandler(dependencies);

async function getRss(): Promise<Response> {
  return getRssResponse();
}

const olderJob: PublicJobCard = {
  id: 'older',
  object: 'job_card',
  slug: 'older-role',
  title: 'Design & Research',
  description: '<p>Build durable systems.</p>',
  publishedAt: '2026-06-01T00:00:00.000Z',
  employmentType: 'full_time',
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
  company: { slug: 'acme', name: 'Acme & Co', logoUrl: null },
  categories: [{ slug: 'design', name: 'Design & UX' }],
  skills: [],
  links: {
    public: 'https://board.example/companies/acme/jobs/older-role',
  },
};

const newerJob: PublicJobCard = {
  ...olderJob,
  id: 'newer',
  slug: 'newer-role',
  title: 'Newer role',
  description: '<p>Keep ]]> inside the description.</p>',
  publishedAt: '2026-07-01T00:00:00.000Z',
  links: {
    public: 'https://board.example/companies/acme/jobs/newer-role',
  },
};

describe('/jobs/rss.xml', () => {
  beforeEach(() => {
    context.mockResolvedValue({ name: 'Example Jobs', language: 'en' });
    listJobs.mockResolvedValue({ data: [olderJob, newerJob] });
  });

  it('serves newest-first RSS with canonical job links and cache headers', async () => {
    const response = await getRss();
    const xml = await response.text();

    expect(response.headers.get('content-type')).toBe(
      'application/rss+xml; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
    expect(listJobs).toHaveBeenCalledWith({
      fields: '+description',
      limit: 50,
    });
    expect(xml.indexOf('Newer role')).toBeLessThan(
      xml.indexOf('Design &amp; Research'),
    );
    expect(xml).toContain(
      'https://board.example/companies/acme/jobs/newer-role',
    );
    expect(xml).toContain('<category>Design &amp; UX</category>');
  });

  it('keeps API-authored descriptions inside their CDATA section', async () => {
    const xml = await (await getRss()).text();

    expect(xml).toContain('Keep ]]&gt; inside the description.');
    expect(xml).not.toContain('Keep ]]> inside the description.');
  });
});
