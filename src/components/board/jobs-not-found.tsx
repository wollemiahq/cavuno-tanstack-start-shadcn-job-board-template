'use client';

import {
  getRouteApi,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { JobsFilterControls } from '@/components/board/jobs-filter-controls';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Page } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { parseJobsSearch } from '@/lib/jobs-search';
import type { UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

/**
 * The not-found state for the programmatic jobs pages. A visitor
 * can search a term and land on a slug that no longer resolves. The global
 * header remains the single keyword/location search owner, while this state
 * describes the failed search rather than exposing the missing taxonomy.
 */
export function JobsNotFound() {
  const { board } = rootApi.useLoaderData();
  const navigate = useNavigate();
  const routeSearch = useRouterState({
    select: (state) => state.location.search,
  });
  // SAFETY: TanStack router search values are JSON-compatible scalars at this
  // route boundary; parseJobsSearch decodes each supported key before use.
  const filters = parseJobsSearch(routeSearch as UrlSearchInput);

  return (
    <Page width="wide">
      <main data-layout="job-search-not-found">
        <Box border="bottom" paddingX={{ base: '4', md: '8' }}>
          <Container width="wide">
            <div className="py-3">
              <JobsFilterControls
                filters={filters}
                language={board.language}
                onChange={(next) =>
                  navigate({
                    to: '/jobs',
                    search: () => ({
                      ...next,
                      page: undefined,
                      selectedJob: undefined,
                    }),
                  })
                }
              />
            </div>
          </Container>
        </Box>

        <Box paddingX={{ base: '4', md: '8' }} paddingY="4">
          <div className="mx-auto w-full max-w-6xl">
            <Empty className="min-h-[calc(100dvh-12rem)] border-0 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <h1 className="font-heading text-xl font-semibold tracking-tight">
                  {m.jobSearch_noMatchingResultsHeading()}
                </h1>
                <EmptyDescription>
                  {m.jobSearch_queryEmptyText()}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link to="/jobs" className={buttonVariants()}>
                  {m.jobSearch_resetFiltersAction()}
                </Link>
              </EmptyContent>
            </Empty>
          </div>
        </Box>
      </main>
    </Page>
  );
}
