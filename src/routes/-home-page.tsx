import { jobsCategoryPath } from '@cavuno/board/paths';
import { getRouteApi } from '@tanstack/react-router';

import { toJobCardVM } from '@/board/job-view-model';
import { HomeLanding } from '@/components/board/home-landing';
import { JobAlertFloatingPrompt } from '@/components/job-alert-floating-prompt';
import { entityCopy } from '@/copy-groups/entity';
import { jobAlertDefaultsFromSearch } from '@/lib/job-alert-defaults';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { saveJob } from '@/server/account';

const routeApi = getRouteApi('/');
const rootApi = getRouteApi('__root__');

export function HomePage() {
  const {
    page,
    companies,
    companiesCount,
    topCategories,
    posts,
    postsCount,
    talent,
    talentCount,
  } = routeApi.useLoaderData();
  const { board, user } = rootApi.useLoaderData();
  const copy = {
    entity: entityCopy(),
  };
  // Plural category via Intl.PluralRules, never `count === 1` — the copy
  // seam supplies One/Many forms and the locale decides which applies.
  const countEyebrow = (
    count: number | null | undefined,
    singular: string,
    plural: string,
  ) =>
    typeof count === 'number' && count > 0
      ? `${count.toLocaleString(getLocale())} ${
          new Intl.PluralRules(getLocale()).select(count) === 'one'
            ? singular
            : plural
        }`
      : undefined;

  const jobs = page.data.map((job) => toJobCardVM(job, getLocale()));
  const hiringCompanies = companies
    .filter((company) => company.publishedJobCount > 0)
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
      logoUrl: company.logoUrl,
      // Wire `summary` is already authored-or-derived by the Board API.
      summary: (company as { summary?: string | null }).summary ?? null,
      publishedJobCount: company.publishedJobCount,
      openJobsLabel:
        new Intl.PluralRules(getLocale()).select(company.publishedJobCount) ===
        'one'
          ? m.companyDetail_openJobsCountOne({
              count: company.publishedJobCount.toLocaleString(getLocale()),
            })
          : m.companyDetail_openJobsCountMany({
              count: company.publishedJobCount.toLocaleString(getLocale()),
            }),
    }));
  const categoryCards = [...topCategories]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((related) => ({
      slug: related.slug,
      name: related.term,
      countLabel:
        related.count > 0
          ? new Intl.PluralRules(getLocale()).select(related.count) === 'one'
            ? m.jobSearch_resultsCountOne({
                count: related.count.toLocaleString(getLocale()),
              })
            : m.jobSearch_resultsCountMany({
                count: related.count.toLocaleString(getLocale()),
              })
          : null,
      href: jobsCategoryPath(related.slug),
    }));

  return (
    <>
      <HomeLanding
        jobs={jobs}
        jobsCountLabel={countEyebrow(
          page.count,
          copy.entity.jobSingular,
          copy.entity.jobPlural,
        )}
        companiesCountLabel={countEyebrow(
          companiesCount,
          copy.entity.companySingular,
          copy.entity.companyPlural,
        )}
        talentCountLabel={countEyebrow(
          talentCount,
          m.home_candidateSingular(),
          m.home_candidatePlural(),
        )}
        postsCountLabel={countEyebrow(
          postsCount,
          m.home_postSingular(),
          m.home_postPlural(),
        )}
        categories={categoryCards}
        companies={hiringCompanies}
        posts={posts}
        talent={talent}
        boardName={board.name}
        candidatesEnabled={board.features.candidates}
        employersEnabled={board.features.employers}
        publicJobSubmission={board.features.publicJobSubmission}
        viewer={user ? { emailVerified: user.emailVerified } : null}
        onSaveJob={async (jobId) =>
          saveJob({ data: { jobId } }).then(() => undefined)
        }
      />
      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          defaults={jobAlertDefaultsFromSearch({ source: 'board_home' })}
        />
      ) : null}
    </>
  );
}
