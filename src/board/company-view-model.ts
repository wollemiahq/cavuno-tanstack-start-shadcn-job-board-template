import { normalizeWebsiteUrl } from '@cavuno/board/format';
import { companyMarketPath, companyPath } from '@cavuno/board/paths';

import { cardSummary } from '@/lib/derive-summary';
import type { PublicCompany, PublicCompanyDetail } from '@cavuno/board';

export interface CompanySearchLabels {
  noDescriptionText: string;
  markets: string;
  openJobs: (count: number) => string;
  viewCompany: string;
  viewJobs: string;
  viewSalaries: string;
  website: string;
}

export interface CompanyCardVM {
  id: string;
  /** Board slug — the result-selection key for the search-results list. */
  slug: string;
  name: string;
  logoUrl: string | null;
  avatarName: string;
  descriptionText: string | null;
  detailHref: string;
  publishedJobCount: number;
  openJobsLabel: string | null;
}

export interface CompanyDetailMarketVM {
  key: string;
  name: string;
  href: string;
}

export interface CompanyDetailVM extends Omit<
  CompanyCardVM,
  'descriptionText'
> {
  companySlug: string;
  descriptionHtml: string | null;
  noDescriptionText: string;
  marketChips: CompanyDetailMarketVM[];
  marketsHeading: string;
  websiteHref: string | null;
  websiteLabel: string | null;
  viewCompanyLabel: string;
  viewJobsLabel: string;
  viewSalariesLabel: string;
  websiteHeading: string;
}

export function toCompanyCardVM(
  company: PublicCompany,
  labels: CompanySearchLabels,
): CompanyCardVM {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    avatarName: company.name,
    // Prefer API `summary` on list/search cards (4.2+); fall back to deriving
    // from long-form `description` for older responses.
    descriptionText: cardSummary(company),
    detailHref: companyPath(company.slug),
    publishedJobCount: company.publishedJobCount,
    openJobsLabel:
      company.publishedJobCount > 0
        ? labels.openJobs(company.publishedJobCount)
        : null,
  };
}

export function toCompanyDetailVM(
  company: PublicCompanyDetail,
  labels: CompanySearchLabels,
): CompanyDetailVM {
  const card = toCompanyCardVM(company, labels);
  const normalizedWebsite = normalizeWebsiteUrl(company.website ?? '');
  const websiteHref = normalizedWebsite?.replace(/\/$/, '') ?? null;

  return {
    ...card,
    companySlug: company.slug,
    descriptionHtml: company.description,
    noDescriptionText: labels.noDescriptionText,
    marketChips: company.markets.map((market) => ({
      key: market.slug,
      name: market.name,
      href: companyMarketPath(market.slug),
    })),
    marketsHeading: labels.markets,
    websiteHref,
    websiteLabel: websiteHref ? websiteHref.replace(/^https?:\/\//i, '') : null,
    openJobsLabel: labels.openJobs(company.publishedJobCount),
    viewCompanyLabel: labels.viewCompany,
    viewJobsLabel: labels.viewJobs,
    viewSalariesLabel: labels.viewSalaries,
    websiteHeading: labels.website,
  };
}
