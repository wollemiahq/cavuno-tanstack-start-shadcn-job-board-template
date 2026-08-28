'use client';

import { companyMarketPath } from '@cavuno/board/paths';
import { useLocation } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import type { CompanyCardVM } from '@/board/company-view-model';
import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { CompanySearchResult } from '@/components/board/company-search-result';
import {
  useListingAdRails,
  type AdPlacement,
} from '@/components/board/listing-ad-rail';
import { ListingPagination } from '@/components/board/listing-pagination';
import { Page } from '@/components/layout/page';
import {
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Badge } from '@/components/ui/badge';
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
import { ADS_OFF, type BoardAdsConfig } from '@/lib/board-ads';
import { localizePath } from '@/lib/localized-path';
import { listingPageHref } from '@/lib/pagination';

export function CompanySearchPage({
  companies,
  count,
  page,
  pageSize,
  heading,
  breadcrumb,
  query,
  searchUnavailable = false,
  markets,
  onPageChange,
  selectedCompany,
  onSelectedCompanyReplace,
  onSelectedCompanyPush,
  detail,
  startAd,
  endAd,
  ads = ADS_OFF,
}: {
  companies: CompanyCardVM[];
  count: number;
  page: number;
  pageSize: number;
  heading?: string;
  breadcrumb?: BreadcrumbData;
  query?: string;
  searchUnavailable?: boolean;
  markets: Array<{ slug: string; name: string }>;
  onPageChange: (page: number) => void;
  selectedCompany?: string;
  onSelectedCompanyReplace: (companySlug: string) => void;
  onSelectedCompanyPush: (companySlug: string) => void;
  detail: React.ReactNode;
  startAd?: AdPlacement;
  endAd?: AdPlacement;
  ads?: BoardAdsConfig;
}) {
  const rails = useListingAdRails(ads, startAd, endAd);
  const currentHref = useLocation({ select: (location) => location.href });
  const hasActiveSearch = Boolean(query || breadcrumb);
  const companyVms = companies;
  const companySlugs = companyVms.map((company) => company.slug);
  const selection = useSearchSelection({
    selectedId: selectedCompany,
    resultIds: companySlugs,
    page,
    onReplace: onSelectedCompanyReplace,
    onPush: onSelectedCompanyPush,
  });
  const locale = getLocale();
  const resultCountLabel = m.companySearch_resultsCount({
    count,
    countLabel: count.toLocaleString(locale),
  });
  // Both browse and free-text search are offset-paginated with a total `count`,
  // so the description line always renders the exact "Showing X–Y of N" range —
  // the same honest range as the jobs results header.
  const resultDescription =
    count > 0
      ? m.companySearch_resultsShowingRange({
          from: ((page - 1) * pageSize + 1).toLocaleString(locale),
          to: Math.min(page * pageSize, count).toLocaleString(locale),
          count: count.toLocaleString(locale),
        })
      : null;
  const resultsBar = (
    <div data-slot="company-results-bar" className="pb-3">
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        {resultCountLabel}
      </h1>
      {resultDescription ? (
        <p className="text-muted-foreground text-xs">{resultDescription}</p>
      ) : null}
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
              startAd={rails.startAd}
              endAd={rails.endAd}
              list={
                <div className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0">
                  {searchUnavailable ? null : (
                    <div className="space-y-4">{resultsBar}</div>
                  )}
                  <Empty className="min-h-[calc(100dvh-16rem)] border-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Building2 aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>
                        {searchUnavailable
                          ? m.companySearch_unavailableTitle()
                          : (heading ?? m.companiesIndex_metaTitle())}
                      </EmptyTitle>
                      <EmptyDescription>
                        {searchUnavailable
                          ? m.companySearch_unavailableDescription()
                          : query
                            ? m.companiesIndex_noMatchText({ query })
                            : m.companiesIndex_emptyText()}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveSearch && !searchUnavailable ? (
                      <EmptyContent>
                        <a
                          href={localizePath('/companies')}
                          className={buttonVariants()}
                        >
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
              startAd={rails.startAd}
              endAd={rails.endAd}
              list={
                <SearchResultsList
                  ref={selection.listRef}
                  label={m.companySearch_resultsRegionLabel()}
                  scrollRestorationId="companies-search-results"
                >
                  <div className="space-y-4">{resultsBar}</div>

                  <div className="space-y-3">
                    {companyVms.map((vm, index) => {
                      const companySlug = companySlugs[index]!;
                      return (
                        <div key={vm.id} data-result-id={companySlug}>
                          <CompanySearchResult
                            vm={vm}
                            selected={companySlug === selection.selectedId}
                            onActivate={(event) =>
                              selection.onResultActivate(event, companySlug)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <ListingPagination
                    compact
                    page={page}
                    count={count}
                    pageSize={pageSize}
                    hrefForPage={(nextPage) =>
                      listingPageHref(currentHref, nextPage, [
                        'selectedCompany',
                      ])
                    }
                    onPageChange={onPageChange}
                  />

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
                              <a
                                href={localizePath(
                                  companyMarketPath(market.slug),
                                )}
                              />
                            }
                          >
                            {market.name}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  ) : null}
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
