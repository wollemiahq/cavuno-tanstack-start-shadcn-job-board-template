import { boardCopy } from '#/copy';

import {
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';
import { jobsCategoryPath } from '@cavuno/board/paths';
import { listingJsonLd } from '@cavuno/board/seo';
/**
 * Home `/` — the designed LANDING (CAV-495), not the bare search page.
 * The root is a pure landing page. Old root search/filter URLs redirect to
 * `/jobs`, while the loader fetches only the latest jobs and the collections
 * needed by enabled landing sections.
 */
import { createFileRoute, getRouteApi, redirect } from '@tanstack/react-router';

import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt';
import { JsonLd } from '../components/json-ld';
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults';
import { m } from '../paraglide/messages';
import {
  getBoardContext,
  getSeoBase,
  listBlogPosts,
  listCompanies,
  listJobs,
  listTalent,
} from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import { HomeLanding } from '@/components/board/home-landing';
import { headTitle } from '@/lib/page-title';

interface JobsSearch extends ListingFilters {
  cursor?: string;
}

export const Route = createFileRoute('/')({
  // Full-bleed: the landing owns its distinct hero and page containers.
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: Record<string, unknown>): JobsSearch => ({
    ...parseListingFilters(search),
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    const { cursor, ...jobsSearch } = search;
    const hasLegacyIntent =
      Boolean(cursor) ||
      Boolean(jobsSearch.q) ||
      Boolean(jobsSearch.remoteOption) ||
      Boolean(jobsSearch.employmentType) ||
      Boolean(jobsSearch.seniority?.length) ||
      Boolean(jobsSearch.sort);

    if (hasLegacyIntent) {
      throw redirect({
        to: '/jobs',
        search: jobsSearch,
        replace: true,
      });
    }
  },
  loader: async () => {
    // Board context first — its feature flags decide which additive section
    // reads to issue (the loader fetches only what an enabled section needs).
    // The jobs / companies / seo reads start in parallel, not behind it.
    const boardP = getBoardContext();
    const jobsP = listJobs({
      data: {
        limit: 8,
        fields: '+description',
      },
    });
    // Additive companies read for the landing's "companies hiring" strip.
    const companiesP = listCompanies({ data: { limit: 6 } });
    const seoP = getSeoBase();

    const board = await boardP;
    const [page, companies, seo, blog, talent] = await Promise.all([
      jobsP,
      companiesP,
      seoP,
      // Blog preview — only when the board runs a blog.
      board.features.blog
        ? listBlogPosts({ data: { limit: 3 } })
        : Promise.resolve(null),
      // Talent preview — only when the directory feature is on. The serialised
      // restricted result omits the preview for anonymous home visitors.
      board.features.talentDirectory
        ? listTalent({ data: { limit: 6 } })
        : Promise.resolve(null),
    ]);
    return {
      page,
      companies: companies.data,
      seo,
      posts: blog?.data ?? null,
      talent: talent?.status === 'available' ? talent.page.data : null,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const title = headTitle(loaderData?.seo.boardName, m.home_heroHeadline());
    const description = m.home_heroSupporting();
    const canonical = `${loaderData.seo.origin}/`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonical },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    };
  },
  component: HomePage,
});

const rootApi = getRouteApi('__root__');

function HomePage() {
  const { page, companies, seo, posts, talent } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const countLabel =
    typeof page.count === 'number' && page.count > 0
      ? `${page.count.toLocaleString(board.language)} ${
          page.count === 1 ? copy.entity.jobSingular : copy.entity.jobPlural
        }`
      : undefined;
  const jobs = page.data.map((job) =>
    toJobCardVM(job, board.language, board.labels),
  );
  const hiringCompanies = companies
    .filter((company) => company.publishedJobCount > 0)
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
      logoUrl: company.logoUrl,
      description: company.description,
      openJobsLabel:
        company.publishedJobCount === 1
          ? m.companyDetail_openJobsCountOne({
              count: company.publishedJobCount,
            })
          : m.companyDetail_openJobsCountMany({
              count: company.publishedJobCount,
            }),
    }));

  // The browse envelope's related searches are already ranked and counted, so
  // the category rail costs no extra read. Paths come from the SDK helper.
  const categoryCards = (page.relatedSearches ?? [])
    .filter((related) => related.type === 'category')
    .map((related) => ({
      slug: related.slug,
      name: related.term,
      countLabel:
        related.count > 0
          ? related.count === 1
            ? m.jobSearch_resultsCountOne({
                count: related.count.toLocaleString(board.language),
              })
            : m.jobSearch_resultsCountMany({
                count: related.count.toLocaleString(board.language),
              })
          : null,
      href: jobsCategoryPath(related.slug),
    }));

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: boardCopy(board.language, board.labels).breadcrumbs.jobs },
          ],
          jobs: page.data,
        })}
      />
      <HomeLanding
        jobs={jobs}
        countLabel={countLabel}
        categories={categoryCards}
        companies={hiringCompanies}
        posts={posts}
        talent={talent}
        boardName={board.name}
        candidatesEnabled={board.features.candidates}
        employersEnabled={board.features.employers}
        publicJobSubmission={board.features.publicJobSubmission}
      />
      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          labels={board.labels}
          defaults={jobAlertDefaultsFromSearch({ source: 'board_home' })}
        />
      ) : null}
    </>
  );
}
