import templates from '../content/migration-home.json';
import { entityCopy } from '../copy-groups/entity';
import { resolveText } from '../lib/resolve-text';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

export type HomeCopy = ReturnType<typeof resolveHomeCopy>;
type HomeTemplates = Partial<Record<keyof typeof templates, string | null>>;

/** Uses the home loader's existing totals; never fetches data for a token. */
export function resolveHomeCopy(
  data: {
    boardName: string;
    jobsCount: number | null | undefined;
    companiesCount: number | null | undefined;
    postsCount: number | null | undefined;
    talentCount: number | null | undefined;
  },
  copy: HomeTemplates = templates,
  labels = entityCopy(),
) {
  const formatCount = (count: number | null | undefined) =>
    count != null && Number.isFinite(count) && count >= 0
      ? count.toLocaleString(getLocale())
      : null;
  const common = {
    board_name: data.boardName,
    job_count: formatCount(data.jobsCount),
    job_label: data.jobsCount === 1 ? labels.jobSingular : labels.jobPlural,
    company_label:
      data.companiesCount === 1 ? labels.companySingular : labels.companyPlural,
    candidate_label:
      data.talentCount === 1
        ? labels.candidateSingular
        : labels.candidatePlural,
  };
  // Generic count is section-specific. Hero and SEO have no implicit count;
  // use job_count there when the author explicitly means the jobs total.
  const jobs = { ...common, count: common.job_count };
  const companies = { ...common, count: formatCount(data.companiesCount) };
  const blog = { ...common, count: formatCount(data.postsCount) };
  return {
    heroTitle: resolveText(
      copy.heroTitle ?? m.home_heroHeadline(),
      common,
      data.boardName,
    ),
    heroDescription: resolveText(
      copy.heroDescription ?? m.home_heroSupporting(),
      common,
      '',
    ),
    jobsTitle: resolveText(copy.jobsTitle, jobs, m.home_latestJobsHeading()),
    jobsDescription: resolveText(
      copy.jobsDescription ?? m.home_latestJobsDescription(),
      jobs,
      '',
    ),
    jobsViewMoreText: resolveText(
      copy.jobsViewMoreText,
      jobs,
      m.home_viewAllJobsLabel(),
    ),
    companiesTitle: resolveText(
      copy.companiesTitle,
      companies,
      m.home_companiesHeading(),
    ),
    companiesDescription: resolveText(
      copy.companiesDescription ?? m.home_companiesDescription(),
      companies,
      '',
    ),
    companiesViewMoreText: resolveText(
      copy.companiesViewMoreText,
      companies,
      m.home_viewAllCompaniesLabel(),
    ),
    blogTitle: resolveText(copy.blogTitle, blog, m.home_blogHeading()),
    blogDescription: resolveText(
      copy.blogDescription ?? m.home_blogDescription(),
      blog,
      '',
    ),
    blogViewMoreText: resolveText(
      copy.blogViewMoreText,
      blog,
      m.home_viewAllBlogLabel(),
    ),
    metaTitle: resolveText(copy.metaTitle, common, m.home_heroHeadline()),
    metaDescription: resolveText(
      copy.metaDescription ?? m.home_heroSupporting(),
      common,
      '',
    ),
  };
}
