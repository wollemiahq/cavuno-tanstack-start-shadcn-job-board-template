'use client';

import { companyMarketPath } from '@cavuno/board/paths';
import { Building2 } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyCardVM } from '@/board/company-view-model';
import {
  PageBreadcrumb,
  type BreadcrumbData,
} from '@/components/board/breadcrumb';
import { CompanySearchControls } from '@/components/board/company-search-controls';
import { CompanySearchResult } from '@/components/board/company-search-result';
import { ListingPagination } from '@/components/board/listing-pagination';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { Page, PageHeader } from '@/components/layout/page';
import {
  AdRail,
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSearchSelection } from '@/hooks/use-search-selection';
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
  description,
  breadcrumb,
  query,
  marketSlug,
  markets,
  onSearchSubmit,
  onMarketChange,
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
  description?: string;
  breadcrumb?: BreadcrumbData;
  query?: string;
  marketSlug?: string;
  markets: Array<{ slug: string; name: string }>;
  onSearchSubmit: (query: string) => void;
  onMarketChange: (marketSlug: string | undefined, query: string) => void;
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
  const labels = getCompanySearchLabels();
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

  return (
    <Page width="wide">
      <main data-layout="company-search-page">
        <Box background="muted" border="bottom">
          {breadcrumb ? (
            <PageBreadcrumb
              items={breadcrumb.items}
              ariaLabel={breadcrumb.ariaLabel}
            />
          ) : null}
          <Container width="wide">
            <PageHeader
              align="center"
              title={heading ?? m.companiesIndex_metaTitle()}
              description={description}
            >
              <div className="mt-2 w-full max-w-5xl text-left">
                <CompanySearchControls
                  query={query}
                  marketSlug={marketSlug}
                  markets={markets}
                  labels={{
                    query: m.companySearch_queryLabel(),
                    queryPlaceholder: m.companySearchBar_placeholderText(),
                    market: m.companySearch_marketLabel(),
                    allMarkets: m.companySearch_allMarketsLabel(),
                    search: m.companySearch_searchLabel(),
                  }}
                  onSubmit={onSearchSubmit}
                  onMarketChange={onMarketChange}
                />
              </div>
            </PageHeader>
          </Container>
        </Box>

        <Box
          paddingX={{ base: '4', md: '8' }}
          paddingY={{ base: '6', md: '8' }}
        >
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
                <div className="space-y-4 p-4">
                  <p className="text-muted-foreground text-sm font-medium">
                    {resultCountLabel}
                  </p>

                  {companyVms.length > 0 ? (
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
                  ) : (
                    <Empty className="min-h-72 border">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Building2 aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{m.companiesIndex_metaTitle()}</EmptyTitle>
                        <EmptyDescription>
                          {query
                            ? m.companiesIndex_noMatchText({ query })
                            : m.companiesIndex_emptyText()}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

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
                      page={page}
                      count={count}
                      pageSize={pageSize}
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
                          <a
                            key={market.slug}
                            href={companyMarketPath(market.slug)}
                            className={badgeVariants({ variant: 'outline' })}
                          >
                            {market.name}
                          </a>
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
        </Box>
      </main>
    </Page>
  );
}
