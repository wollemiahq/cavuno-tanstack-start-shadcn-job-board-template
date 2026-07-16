'use client';

import { companyMarketPath } from '@cavuno/board/paths';
import { useLocation } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyCardVM } from '@/board/company-view-model';
import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { CompanySearchResult } from '@/components/board/company-search-result';
import { ListingResultsHeader } from '@/components/board/listing-page-header';
import { ListingPagination } from '@/components/board/listing-pagination';
import { Page } from '@/components/layout/page';
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSearchSelection } from '@/hooks/use-search-selection';
import { listingPageHref } from '@/lib/pagination';
import type { PublicCompany } from '@cavuno/board';

type AdPlacement = {
  label: string;
  content: React.ReactNode;
};

export function CompanySearchPage({
  companies,
  count,
  page,
  pageSize,
  heading,
  breadcrumb,
  query,
  markets,
  onPageChange,
  hasMore = false,
  onLoadMore,
  selectedCompany,
  onSelectedCompanyReplace,
  onSelectedCompanyPush,
  detail,
  startAd,
  endAd,
}: {
  companies: PublicCompany[];
  count: number;
  page: number;
  pageSize: number;
  heading?: string;
  breadcrumb?: BreadcrumbData;
  query?: string;
  markets: Array<{ slug: string; name: string }>;
  onPageChange: (page: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  selectedCompany?: string;
  onSelectedCompanyReplace: (companySlug: string) => void;
  onSelectedCompanyPush: (companySlug: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
}) {
  const currentHref = useLocation({ select: (location) => location.href });
  const labels = getCompanySearchLabels();
  const hasActiveSearch = Boolean(query || breadcrumb);
  const companyVms = companies.map((company) =>
    toCompanyCardVM(company, labels),
  );
  const companySlugs = companies.map((company) => company.slug);
  const selection = useSearchSelection({
    selectedId: selectedCompany,
    resultIds: companySlugs,
    onReplace: onSelectedCompanyReplace,
    onPush: onSelectedCompanyPush,
  });
  const resultCountLabel =
    count === 1
      ? m.companySearch_resultsCountOne({ count })
      : m.companySearch_resultsCountMany({ count });
  const resultsBar = (
    <div
      data-slot="company-results-bar"
      className={companyVms.length > 0 ? 'px-4 pb-3 md:px-0' : 'pb-3'}
    >
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        {resultCountLabel}
      </h1>
    </div>
  );
  return (
    <Page width="wide" fill>
      <main
        data-layout="company-search-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <div
          data-slot="company-search-viewport"
          className="min-w-0 overflow-x-clip md:flex md:min-h-0 md:flex-1 md:overflow-hidden"
        >
          {companyVms.length === 0 ? (
            <SearchResultsLayout
              startAd={
                startAd ? (
                  <AdRail label={startAd.label}>{startAd.content}</AdRail>
                ) : undefined
              }
              endAd={
                endAd ? (
                  <AdRail label={endAd.label}>{endAd.content}</AdRail>
                ) : undefined
              }
              list={
                <div className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0">
                  <ListingResultsHeader breadcrumb={breadcrumb}>
                    {resultsBar}
                  </ListingResultsHeader>
                  <Empty className="min-h-[calc(100dvh-16rem)] border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Building2 aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {heading ?? m.companiesIndex_metaTitle()}
                      </EmptyTitle>
                      <EmptyDescription>
                        {query
                          ? m.companiesIndex_noMatchText({ query })
                          : m.companiesIndex_emptyText()}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveSearch ? (
                      <EmptyContent>
                        <a href="/companies" className={buttonVariants()}>
                          {m.jobSearch_resetFiltersAction()}
                        </a>
                      </EmptyContent>
                    ) : null}
                  </Empty>
                </div>
              }
              detail={null}
            />
          ) : (
            <SearchResultsLayout
              startAd={
                startAd ? (
                  <AdRail label={startAd.label}>{startAd.content}</AdRail>
                ) : undefined
              }
              endAd={
                endAd ? (
                  <AdRail label={endAd.label}>{endAd.content}</AdRail>
                ) : undefined
              }
              list={
                <SearchResultsList
                  label={m.companySearch_resultsRegionLabel()}
                  scrollRestorationId="companies-search-results"
                >
                  <div className="space-y-4 pt-4 pr-4 pb-4">
                    <ListingResultsHeader breadcrumb={breadcrumb}>
                      {resultsBar}
                    </ListingResultsHeader>

                    <div className="space-y-3">
                      {companyVms.map((vm, index) => {
                        const companySlug = companySlugs[index]!;
                        return (
                          <CompanySearchResult
                            key={vm.id}
                            vm={vm}
                            selected={companySlug === selection.selectedId}
                            onActivate={(event) =>
                              selection.onResultActivate(event, companySlug)
                            }
                          />
                        );
                      })}
                    </div>

                    {query ? (
                      hasMore && onLoadMore ? (
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={onLoadMore}
                          >
                            {m.companiesIndex_nextResultsLabel()}
                          </Button>
                        </div>
                      ) : null
                    ) : (
                      <ListingPagination
                        compact
                        page={page}
                        count={count}
                        pageSize={pageSize}
                        hrefForPage={(nextPage) =>
                          listingPageHref(currentHref, nextPage, [
                            'cursor',
                            'selectedCompany',
                          ])
                        }
                        onPageChange={onPageChange}
                      />
                    )}

                    {markets.length > 0 ? (
                      <section
                        aria-label={m.companiesIndex_browseByMarketHeading()}
                        className="border-border space-y-3 border-t pt-4"
                      >
                        <h2 className="text-sm font-semibold">
                          {m.companiesIndex_browseByMarketHeading()}
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {markets.map((market) => (
                            <Badge
                              key={market.slug}
                              variant="outline"
                              render={
                                <a href={companyMarketPath(market.slug)} />
                              }
                            >
                              {market.name}
                            </Badge>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                </SearchResultsList>
              }
              detail={
                <SearchResultDetail
                  ref={selection.detailRef}
                  label={m.companySearch_selectedCompanyRegionLabel()}
                  scrollRestorationId="companies-selected-detail"
                >
                  {detail}
                </SearchResultDetail>
              }
            />
          )}
        </div>
      </main>
    </Page>
  );
}
