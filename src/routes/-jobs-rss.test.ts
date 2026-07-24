import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  listJobs: vi.fn(),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://board.example/jobs/rss.xml'),
}));

vi.mock('../lib/board', () => ({
  getBoard: () => ({
    context: mocks.context,
    jobs: { list: mocks.listJobs },
  }),
}));

import { Route } from './jobs.rss[.]xml';

type GetHandler = () => Promise<Response> | Response;

function getHandler(): GetHandler {
  const handlers = Route.options.server?.handlers as
    | { GET?: GetHandler }
    | GetHandler
    | undefined;
  const get =
    typeof handlers === 'function'
      ? undefined
      : handlers && typeof handlers === 'object'
        ? handlers.GET
        : undefined;
  if (typeof get !== 'function') {
    throw new Error('expected /jobs/rss.xml to export a GET server handler');
  }
  return get;
}

const olderJob = {
  id: 'older',
  slug: 'older-role',
  title: 'Design & Research',
  description: '<p>Build durable systems.</p>',
  publishedAt: '2026-06-01T00:00:00.000Z',
  employmentType: 'full_time',
  company: { slug: 'acme', name: 'Acme & Co' },
  categories: [{ name: 'Design & UX' }],
};

const newerJob = {
  ...olderJob,
  id: 'newer',
  slug: 'newer-role',
  title: 'Newer role',
  description: '<p>Keep ]]> inside the description.</p>',
  publishedAt: '2026-07-01T00:00:00.000Z',
};

describe('/jobs/rss.xml', () => {
  beforeEach(() => {
    mocks.context.mockResolvedValue({ name: 'Example Jobs' });
    mocks.listJobs.mockResolvedValue({ data: [olderJob, newerJob] });
  });

  it('serves newest-first RSS with canonical job links and cache headers', async () => {
    const response = await getHandler()();
    const xml = await response.text();

    expect(response.headers.get('content-type')).toBe(
      'application/rss+xml; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
    expect(mocks.listJobs).toHaveBeenCalledWith({
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
    const xml = await (await getHandler()()).text();

    expect(xml).toContain('Keep ]]&gt; inside the description.');
    expect(xml).not.toContain('Keep ]]> inside the description.');
  });
});
