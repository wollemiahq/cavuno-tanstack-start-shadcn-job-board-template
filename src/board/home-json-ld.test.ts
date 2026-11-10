import { describe, expect, it } from 'vitest';

import { parseJobsIndexSearch } from '../lib/jobs-search';
import { homeJsonLd } from './home-json-ld';

const HOME = 'https://jobs.example/';
const JOBS = 'https://jobs.example/jobs';

describe('homeJsonLd', () => {
  it('describes the site, its jobs search and the board as an organization', () => {
    const [website, organization] = homeJsonLd({
      boardName: 'Example Jobs',
      homeUrl: HOME,
      jobsUrl: JOBS,
      logoUrl: 'https://cdn.example/logo.png',
    });

    expect(website).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Example Jobs',
      url: HOME,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${JOBS}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    });
    expect(organization).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Example Jobs',
      url: HOME,
      logo: 'https://cdn.example/logo.png',
    });
  });

  it('searches with the query parameter the jobs listing reads', () => {
    const [website] = homeJsonLd({
      boardName: 'Example Jobs',
      homeUrl: HOME,
      jobsUrl: JOBS,
      logoUrl: null,
    });
    const url = new URL(
      website.potentialAction.target.urlTemplate.replace(
        '{search_term_string}',
        'nurse',
      ),
    );

    expect(url.pathname).toBe('/jobs');
    expect(parseJobsIndexSearch(Object.fromEntries(url.searchParams)).q).toBe(
      'nurse',
    );
  });

  it('leaves the logo out when the board has none and resolves a relative one', () => {
    const base = { boardName: 'Example Jobs', homeUrl: HOME, jobsUrl: JOBS };
    expect(homeJsonLd({ ...base, logoUrl: null })[1]).not.toHaveProperty(
      'logo',
    );
    expect(homeJsonLd({ ...base, logoUrl: '/logo.png' })[1].logo).toBe(
      'https://jobs.example/logo.png',
    );
  });
});
