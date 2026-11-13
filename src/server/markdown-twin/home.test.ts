import {
  blogPostPath,
  companyPath,
  jobDetailPath,
  jobsCategoryPath,
} from '@cavuno/board/paths';
import { describe, expect, it, vi } from 'vitest';

import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { publicJobCardFixture } from '../../routes/-route-test-fixtures';
import { escapeInline } from './format';
import { buildHomeTwin, type HomeTwinDependencies } from './home';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://board.example/';

const copy = {
  heroTitle: 'Find *robotics* jobs',
  heroDescription: 'Every robotics role in one place.',
  jobsTitle: 'Latest jobs',
  jobsViewMoreText: 'All jobs',
  companiesTitle: 'Hiring now',
  companiesViewMoreText: 'All companies',
  blogTitle: 'From the blog',
  blogViewMoreText: 'All posts',
};

type HomePage = Awaited<ReturnType<HomeTwinDependencies['getHomePage']>>;

function dependencies(overrides: Partial<HomePage> = {}): HomeTwinDependencies {
  return {
    getHomePage: vi.fn(async () => ({
      copy,
      page: { data: [publicJobCardFixture('engineer')] },
      topCategories: [],
      companies: [],
      posts: null,
      seo: { origin: ORIGIN },
      head: { links: [{ rel: 'canonical', href: CANONICAL }] },
      ...overrides,
    })),
    readBoardContext: vi.fn(async () => ({})),
  };
}

function homeTwin() {
  const twin = resolveMarkdownTwin({
    method: 'GET',
    url: `${ORIGIN}/index.md`,
  });
  if (!twin) throw new Error('no home twin');
  return twin;
}

async function body(deps: HomeTwinDependencies) {
  const result = await buildHomeTwin(homeTwin(), ORIGIN, deps);
  if (result.type !== 'markdown') throw new Error(result.type);
  expect(result.canonical).toBe(CANONICAL);
  return result.body;
}

describe('buildHomeTwin', () => {
  it('follows the landing: hero, latest jobs and a link to all of them', async () => {
    const text = await body(dependencies());

    expect(text.startsWith(`# ${escapeInline(copy.heroTitle)}\n`)).toBe(true);
    const job = selfUrl(ORIGIN, jobDetailPath('acme', 'engineer'));
    expect(text).toContain(`## Latest jobs\n\n- [engineer](${job}) · Acme`);
    expect(text).toContain(`[All jobs](${selfUrl(ORIGIN, '/jobs')})`);
    // Empty sections are left out, as on the landing.
    expect(text).not.toContain(m.home_categoriesHeading());
    expect(text).not.toContain('## Hiring now');
  });

  it('lists categories, hiring companies and posts by their page URLs', async () => {
    const text = await body(
      dependencies({
        topCategories: [
          {
            type: 'category',
            slug: 'software',
            canonicalSlug: 'software',
            term: 'Software',
            displayName: 'Software',
            count: 0,
          },
        ],
        companies: [
          { slug: 'acme', name: 'Acme', publishedJobCount: 2 },
          { slug: 'idle', name: 'Idle', publishedJobCount: 0 },
        ],
        posts: [{ slug: 'hello', title: 'Hello' }],
      }),
    );

    const category = selfUrl(ORIGIN, jobsCategoryPath('software'));
    expect(text).toContain(`- [Software](${category})\n`);
    const openJobs = m.companyDetail_openJobsCount({
      count: 2,
      countLabel: (2).toLocaleString(getLocale()),
    });
    expect(text).toContain(
      `- [Acme](${selfUrl(ORIGIN, companyPath('acme'))}) · ${escapeInline(openJobs)}`,
    );
    expect(text).not.toContain('[Idle]');
    expect(text).toContain(
      `- [Hello](${selfUrl(ORIGIN, blogPostPath('hello'))})`,
    );
  });
});
