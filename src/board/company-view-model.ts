import { normalizeWebsiteUrl } from '@cavuno/board/format';
import { companyMarketPath, companyPath } from '@cavuno/board/paths';

import {
  resolveProfileFieldDisplay,
  type DisplayFieldSource,
  type FieldDisplayEntry,
} from '@/board/custom-field-display';
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
  /**
   * The company's membership plan name — public identity, shown as a badge
   * wherever the company renders. `null` when it holds no membership.
   */
  membershipPlanName: string | null;
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
  /** The company's custom and collection field answers, placed by type. */
  fields: CompanyFieldGroups;
}

/**
 * Where each custom field goes on the company page and pane: formatted text
 * and galleries in the main column, every shorter answer with the key facts.
 */
export interface CompanyFieldGroups {
  main: FieldDisplayEntry[];
  facts: FieldDisplayEntry[];
}

export function toCompanyFieldGroups(
  company: PublicCompany,
  fieldLayout: readonly DisplayFieldSource[],
  locale: string,
): CompanyFieldGroups {
  const entries = resolveProfileFieldDisplay(fieldLayout, company, locale);
  const inMain = (entry: FieldDisplayEntry) =>
    entry.type === 'rich_text' || entry.type === 'image_gallery';
  return {
    main: entries.filter(inMain),
    facts: entries.filter((entry) => !inMain(entry)),
  };
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
    // Platform card teaser only — never re-derive from description HTML.
    descriptionText: cardSummary(company),
    detailHref: companyPath(company.slug),
    publishedJobCount: company.publishedJobCount,
    openJobsLabel:
      company.publishedJobCount > 0
        ? labels.openJobs(company.publishedJobCount)
        : null,
    membershipPlanName: company.membership?.planName ?? null,
  };
}

export function toCompanyDetailVM(
  company: PublicCompanyDetail,
  labels: CompanySearchLabels,
  /**
   * The company form's fields (`profileLayoutFields(board.forms.company)`)
   * and the display locale; omit to show no custom fields.
   */
  fields?: { layout: readonly DisplayFieldSource[]; locale: string },
): CompanyDetailVM {
  const card = toCompanyCardVM(company, labels);
  const normalizedWebsite = normalizeWebsiteUrl(company.website ?? '');
  const websiteHref = normalizedWebsite?.replace(/\/$/, '') ?? null;

  return {
    ...card,
    companySlug: company.slug,
    descriptionHtml: company.description,
    noDescriptionText: labels.noDescriptionText,
    // Board-language name, linked by the board-language slug.
    marketChips: company.markets.map((market) => ({
      key: market.slug,
      name: market.displayName,
      href: companyMarketPath(market.canonicalSlug),
    })),
    marketsHeading: labels.markets,
    websiteHref,
    websiteLabel: websiteHref ? websiteHref.replace(/^https?:\/\//i, '') : null,
    openJobsLabel: labels.openJobs(company.publishedJobCount),
    viewCompanyLabel: labels.viewCompany,
    viewJobsLabel: labels.viewJobs,
    viewSalariesLabel: labels.viewSalaries,
    websiteHeading: labels.website,
    fields: fields
      ? toCompanyFieldGroups(company, fields.layout, fields.locale)
      : { main: [], facts: [] },
  };
}
