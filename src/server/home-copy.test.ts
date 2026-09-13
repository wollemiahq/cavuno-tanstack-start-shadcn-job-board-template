import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { resolveHomeCopy } from './home-copy';

const labels = {
  jobSingular: 'internship',
  jobPlural: 'internships',
  companySingular: 'employer',
  companyPlural: 'employers',
  candidateSingular: 'profile',
  candidatePlural: 'profiles',
  candidatePresent: 'Present',
};

const data = {
  boardName: 'EngineersWA',
  jobsCount: 303,
  companiesCount: 210,
  postsCount: 7,
  talentCount: 1,
};

describe('home copy from existing loader data', () => {
  it('uses distinct section totals, localized counts and configured entity labels', () => {
    const templates = {
      heroTitle: '{{board_name}}',
      heroDescription: '{{job_count}} {{job_label}}',
      jobsTitle: '{{count}} {{job_label}}',
      jobsViewMoreText: 'Browse {{count}}',
      companiesTitle: '{{count}} {{company_label}}',
      blogTitle: '{{count}} posts',
      metaTitle: '{{board_name}}: {{job_count}} {{job_label}}',
      metaDescription: '{{candidate_label}}',
    };
    const first = resolveHomeCopy(data, templates, labels);
    expect(first).toMatchObject({
      heroTitle: 'EngineersWA',
      heroDescription: '303 internships',
      jobsTitle: '303 internships',
      jobsViewMoreText: 'Browse 303',
      companiesTitle: '210 employers',
      blogTitle: '7 posts',
      metaTitle: 'EngineersWA: 303 internships',
      metaDescription: 'profile',
    });
    expect(
      resolveHomeCopy({ ...data, jobsCount: 1004 }, templates, labels)
        .jobsTitle,
    ).toBe('1,004 internships');
    expect(
      resolveHomeCopy({ ...data, jobsCount: 1 }, templates, labels).jobsTitle,
    ).toBe('1 internship');
    expect(
      resolveHomeCopy({ ...data, jobsCount: 0 }, templates, labels).jobsTitle,
    ).toBe('0 internships');
  });
  it('uses field fallbacks for unknown, missing and ambiguous tokens', () => {
    const result = resolveHomeCopy(
      { ...data, companiesCount: null },
      {
        heroTitle: '{{hitr}}',
        heroDescription: 'Browse {{count}} jobs',
        jobsTitle: '{{location}} jobs',
        jobsDescription: 'Jobs in {{location}}',
        companiesTitle: '{{count}} companies',
        companiesDescription: '{{count}} companies',
        jobsViewMoreText: '{{unknown}}',
        metaTitle: '{{unknown}}',
        metaDescription: '{{unknown}}',
      },
    );
    expect(result).toMatchObject({
      heroTitle: 'EngineersWA',
      heroDescription: '',
      jobsTitle: m.home_latestJobsHeading(),
      jobsDescription: '',
      companiesTitle: m.home_companiesHeading(),
      companiesDescription: '',
      jobsViewMoreText: m.home_viewAllJobsLabel(),
      metaTitle: m.home_heroHeadline(),
      metaDescription: '',
    });
  });
  it('preserves starter defaults for absent content and intentional empty values', () => {
    const result = resolveHomeCopy(data, {});
    expect(result.heroTitle).toBe(m.home_heroHeadline());
    expect(result.heroDescription).toBe(m.home_heroSupporting());
    expect(result.jobsDescription).toBe(m.home_latestJobsDescription());
    expect(
      resolveHomeCopy(data, { heroDescription: '', jobsTitle: '' }),
    ).toMatchObject({
      heroDescription: '',
      jobsTitle: '',
    });
  });
});
