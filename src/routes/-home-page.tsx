import { jobsCategoryPath } from '@cavuno/board/paths';
import { getRouteApi } from '@tanstack/react-router';

import { toJobCardVM } from '@/board/job-view-model';
import { sellsTalentProfileUnlocks } from '@/board/talent-view-model';
import { HomeLanding } from '@/components/board/home-landing';
import { JobAlertFloatingPrompt } from '@/components/job-alert-floating-prompt';
import { useRootSession } from '@/components/root-session';
import { entityCount } from '@/lib/entity-count';
import { jobAlertDefaultsFromSearch } from '@/lib/job-alert-defaults';
import { backgroundImageUrl } from '@/lib/site-branding';
import { chromeEntity } from '@/lib/site-chrome';
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
  const { board } = rootApi.useLoaderData();
  const { user, talentAccess } = useRootSession();
  // Counts render through `entityCount`, which picks the CLDR plural form.
  const chromeEntityOverrides = chromeEntity();
  const countEyebrow = (
    count: number | null | undefined,
    message: (args: { count: number; countLabel: string }) => string,
    override?: { singular?: string; plural?: string },
  ) => {
    const safeCount = Number(count);
    if (!Number.isFinite(safeCount) || safeCount <= 0) return undefined;
    return entityCount(safeCount, getLocale(), message, override);
  };

  const jobs = page.data.map((job) => toJobCardVM(job, getLocale(), board));
  const hiringCompanies = companies
    .filter((company) => company.publishedJobCount > 0)
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
      logoUrl: company.logoUrl,
      // Wire `summary` is already authored-or-derived by the Board API.
      summary: company.summary,
      publishedJobCount: company.publishedJobCount,
      openJobsLabel: m.companyDetail_openJobsCount({
        count: company.publishedJobCount,
        countLabel: company.publishedJobCount.toLocaleString(getLocale()),
      }),
      membershipPlanName: company.membership?.planName ?? null,
    }));
  const categoryCards = [...topCategories]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((related) => ({
      slug: related.slug,
      name: related.term,
      countLabel:
        related.count > 0
          ? entityCount(related.count, getLocale(), m.count_jobs, {
              singular: chromeEntity().jobSingular,
              plural: chromeEntity().jobPlural,
            })
          : null,
      href: jobsCategoryPath(related.slug),
    }));

  return (
    <>
      <HomeLanding
        jobs={jobs}
        jobsCountLabel={countEyebrow(page.count, m.count_jobs, {
          singular: chromeEntityOverrides.jobSingular,
          plural: chromeEntityOverrides.jobPlural,
        })}
        companiesCountLabel={countEyebrow(companiesCount, m.count_companies, {
          singular: chromeEntityOverrides.companySingular,
          plural: chromeEntityOverrides.companyPlural,
        })}
        talentCountLabel={countEyebrow(talentCount, m.count_candidates, {
          singular: chromeEntityOverrides.candidateSingular,
          plural: chromeEntityOverrides.candidatePlural,
        })}
        postsCountLabel={countEyebrow(postsCount, m.count_posts)}
        categories={categoryCards}
        companies={hiringCompanies}
        posts={posts}
        talent={talent}
        profileUnlocks={sellsTalentProfileUnlocks(talentAccess.accessModel)}
        boardName={board.name}
        candidatesEnabled={board.features.candidates}
        employersEnabled={board.features.employers}
        publicJobSubmission={board.features.publicJobSubmission}
        backgroundImageUrl={backgroundImageUrl()}
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
