import {
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';
/**
 * Home `/` — the designed landing, not the bare search page.
 * The root is a pure landing page. Old root search/filter URLs redirect to
 * `/jobs`, while the loader fetches only the latest jobs and the collections
 * needed by enabled landing sections.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getBoardContext,
  getSeoBase,
  listBlogPosts,
  listCompanies,
  listJobs,
  listTalent,
  listTopJobCategories,
} from '../server/queries';
import { HomePage } from './-home-page';

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
    // Every additive section read fails soft: the landing hides an empty
    // section, so a rejecting preview strip must never fault the whole page.
    const companiesP = listCompanies({ data: { limit: 6 } }).catch(() => null);
    // Board-wide top categories by live job count — its OWN read, so the
    // "Browse by category" section ranks the whole board, not the cards below.
    const topCategoriesP = listTopJobCategories().catch(() => []);
    const seoP = getSeoBase();

    const board = await boardP;
    const [page, companies, topCategories, seo, blog, talent] =
      await Promise.all([
        jobsP,
        companiesP,
        topCategoriesP,
        seoP,
        // Blog preview — only when the board runs a blog.
        board.features.blog
          ? listBlogPosts({ data: { limit: 3 } }).catch(() => null)
          : Promise.resolve(null),
        // Talent preview — only when the directory feature is on. The
        // serialised restricted result omits the preview for anonymous home
        // visitors.
        board.features.talentDirectory
          ? listTalent({ data: { limit: 6 } }).catch(() => null)
          : Promise.resolve(null),
      ]);
    const talentPage = talent?.status === 'available' ? talent.page : null;
    return {
      page,
      companies: companies?.data ?? [],
      companiesCount: companies?.count ?? null,
      topCategories,
      seo,
      posts: blog?.data ?? null,
      postsCount: blog?.count ?? null,
      talent: talentPage?.data ?? null,
      talentCount: talentPage?.count ?? null,
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
