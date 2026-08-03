/**
 * The canonical chrome-copy compatibility adapter.
 *
 * Runtime routes and components import the smallest resolver under
 * `copy-groups/` that they use. Keeping this complete adapter gives tests and
 * compatibility callers one authoritative representation of the public
 * `UiCopy` contract without making every message family reachable from the
 * universal client entry.
 *
 * Copy resolves from compiled Paraglide messages keyed by the runtime locale
 * (`getLocale()` — the URL
 * locale under the `/de/`-style chrome prefixes), overlaid with the
 * board's operator label overrides. The `language` parameter callers
 * thread is retained for the block prop contract but no longer selects
 * the catalog: `baseLocale === board.language` is a generation-time
 * invariant (project.inlang/settings.json is emitted per board), so the
 * unprefixed site renders the board language and prefixed locales follow
 * the URL.
 */
import { m } from './paraglide/messages';

import type { BoardLabelOverrides, UiCopy } from '@cavuno/board/format';

export type BoardCopy = UiCopy;
export type { BoardLabelOverrides };

type MessageFn = (inputs?: Record<string, unknown>) => string;

/**
 * Only the message families that make up the public `UiCopy` contract.
 *
 * Keep these as statically-addressed properties instead of enumerating `m`.
 * `Object.entries(m)` makes every generated Paraglide message reachable and
 * defeats its per-message tree-shaking, including private account, employer,
 * preview, and messaging copy that does not belong to this adapter.
 */
const UI_COPY_MESSAGES = [
  ['alerts_emailAriaLabel', m.alerts_emailAriaLabel],
  ['alerts_jobAlertButtonText', m.alerts_jobAlertButtonText],
  ['alerts_jobAlertEmailPlaceholder', m.alerts_jobAlertEmailPlaceholder],
  ['alerts_jobAlertErrorToast', m.alerts_jobAlertErrorToast],
  ['alerts_jobAlertSuccessToast', m.alerts_jobAlertSuccessToast],
  ['alerts_jobAlertTitle', m.alerts_jobAlertTitle],
  ['alerts_sectionAriaLabel', m.alerts_sectionAriaLabel],
  ['alerts_submitAriaLabel', m.alerts_submitAriaLabel],
  ['alerts_subscribingLabel', m.alerts_subscribingLabel],
  ['apply_applicationSubmitError', m.apply_applicationSubmitError],
  ['apply_appliedViewApplicationsLabel', m.apply_appliedViewApplicationsLabel],
  ['apply_applyButtonText', m.apply_applyButtonText],
  ['apply_applyOnEmployerSiteLabel', m.apply_applyOnEmployerSiteLabel],
  ['apply_applyingLabel', m.apply_applyingLabel],
  ['apply_signInToApplyLabel', m.apply_signInToApplyLabel],
  ['apply_verifyEmailToApplyLabel', m.apply_verifyEmailToApplyLabel],
  ['blog_bylineLabel', m.blog_bylineLabel],
  ['blog_clearButtonLabel', m.blog_clearButtonLabel],
  ['blog_emptyDescription', m.blog_emptyDescription],
  ['blog_emptyResetLabel', m.blog_emptyResetLabel],
  ['blog_emptyTitle', m.blog_emptyTitle],
  ['blog_readingTimeLabel', m.blog_readingTimeLabel],
  ['blog_searchLabel', m.blog_searchLabel],
  ['blog_searchPlaceholder', m.blog_searchPlaceholder],
  ['blog_tagFilterAllLabel', m.blog_tagFilterAllLabel],
  ['blog_tagFilterLabel', m.blog_tagFilterLabel],
  ['breadcrumbs_about', m.breadcrumbs_about],
  ['breadcrumbs_blog', m.breadcrumbs_blog],
  ['breadcrumbs_companies', m.breadcrumbs_companies],
  ['breadcrumbs_cookiePolicy', m.breadcrumbs_cookiePolicy],
  ['breadcrumbs_home', m.breadcrumbs_home],
  ['breadcrumbs_impressum', m.breadcrumbs_impressum],
  ['breadcrumbs_jobs', m.breadcrumbs_jobs],
  ['breadcrumbs_locations', m.breadcrumbs_locations],
  ['breadcrumbs_post', m.breadcrumbs_post],
  ['breadcrumbs_pricing', m.breadcrumbs_pricing],
  ['breadcrumbs_privacyPolicy', m.breadcrumbs_privacyPolicy],
  ['breadcrumbs_salaries', m.breadcrumbs_salaries],
  ['breadcrumbs_skills', m.breadcrumbs_skills],
  ['breadcrumbs_talent', m.breadcrumbs_talent],
  ['breadcrumbs_termsOfService', m.breadcrumbs_termsOfService],
  ['breadcrumbs_titles', m.breadcrumbs_titles],
  ['copyLink_ariaLabel', m.copyLink_ariaLabel],
  ['copyLink_copiedLabel', m.copyLink_copiedLabel],
  ['copyLink_copyLinkLabel', m.copyLink_copyLinkLabel],
  ['entity_companyPlural', m.entity_companyPlural],
  ['entity_companySingular', m.entity_companySingular],
  ['entity_jobPlural', m.entity_jobPlural],
  ['entity_jobSingular', m.entity_jobSingular],
  ['footer_aboutHeading', m.footer_aboutHeading],
  ['footer_aboutLabel', m.footer_aboutLabel],
  ['footer_allRightsReservedText', m.footer_allRightsReservedText],
  ['footer_contactLabel', m.footer_contactLabel],
  ['footer_cookiePolicyLabel', m.footer_cookiePolicyLabel],
  ['footer_copyrightPrefix', m.footer_copyrightPrefix],
  ['footer_defaultDescription', m.footer_defaultDescription],
  ['footer_forCandidatesHeading', m.footer_forCandidatesHeading],
  ['footer_forCompaniesHeading', m.footer_forCompaniesHeading],
  ['footer_impressumLabel', m.footer_impressumLabel],
  ['footer_locationsLabel', m.footer_locationsLabel],
  ['footer_poweredByText', m.footer_poweredByText],
  ['footer_privacyPolicyLabel', m.footer_privacyPolicyLabel],
  ['footer_resourcesHeading', m.footer_resourcesHeading],
  ['footer_salariesLabel', m.footer_salariesLabel],
  ['footer_sitemapLabel', m.footer_sitemapLabel],
  ['footer_termsOfServiceLabel', m.footer_termsOfServiceLabel],
  ['footer_websiteLabel', m.footer_websiteLabel],
  ['jobCard_aiRankedLabel', m.jobCard_aiRankedLabel],
  ['jobCard_featuredLabel', m.jobCard_featuredLabel],
  ['jobCard_relatedSearchesTitle', m.jobCard_relatedSearchesTitle],
  ['jobCard_sortNewestLabel', m.jobCard_sortNewestLabel],
  ['jobCard_sortSalaryHighLabel', m.jobCard_sortSalaryHighLabel],
  ['jobDetail_aboutCompanyHeading', m.jobDetail_aboutCompanyHeading],
  ['jobDetail_additionalDetailsHeading', m.jobDetail_additionalDetailsHeading],
  ['jobDetail_breadcrumbAriaLabel', m.jobDetail_breadcrumbAriaLabel],
  ['jobDetail_categoriesHeading', m.jobDetail_categoriesHeading],
  ['jobDetail_customFieldNoLabel', m.jobDetail_customFieldNoLabel],
  ['jobDetail_customFieldYesLabel', m.jobDetail_customFieldYesLabel],
  ['jobDetail_educationLabel', m.jobDetail_educationLabel],
  ['jobDetail_experienceLabel', m.jobDetail_experienceLabel],
  ['jobDetail_experienceYears', m.jobDetail_experienceYears],
  [
    'jobDetail_locationNotSpecifiedLabel',
    m.jobDetail_locationNotSpecifiedLabel,
  ],
  ['jobDetail_locationsLabel', m.jobDetail_locationsLabel],
  ['jobDetail_noDescriptionText', m.jobDetail_noDescriptionText],
  [
    'jobDetail_noExperienceRequiredLabel',
    m.jobDetail_noExperienceRequiredLabel,
  ],
  ['jobDetail_posted', m.jobDetail_posted],
  ['jobDetail_sidebarAriaLabel', m.jobDetail_sidebarAriaLabel],
  ['jobDetail_similarJobsHeading', m.jobDetail_similarJobsHeading],
  ['jobDetail_skillsHeading', m.jobDetail_skillsHeading],
  ['jobDetail_timezonesLabel', m.jobDetail_timezonesLabel],
  ['jobDetail_viewCompanyProfileLabel', m.jobDetail_viewCompanyProfileLabel],
  ['jobDetail_workPermitsLabel', m.jobDetail_workPermitsLabel],
  ['jobDetail_worldwideLabel', m.jobDetail_worldwideLabel],
  ['jobSearch_allFiltersLabel', m.jobSearch_allFiltersLabel],
  ['jobSearch_anyTypeLabel', m.jobSearch_anyTypeLabel],
  ['jobSearch_anyWorkplaceLabel', m.jobSearch_anyWorkplaceLabel],
  ['jobSearch_applyFiltersLabel', m.jobSearch_applyFiltersLabel],
  ['jobSearch_cancelLabel', m.jobSearch_cancelLabel],
  ['jobSearch_clearFiltersLabel', m.jobSearch_clearFiltersLabel],
  ['jobSearch_contextualResultsHeading', m.jobSearch_contextualResultsHeading],
  ['jobSearch_detailErrorTitle', m.jobSearch_detailErrorTitle],
  ['jobSearch_detailLoadingLabel', m.jobSearch_detailLoadingLabel],
  ['jobSearch_filterSheetDescription', m.jobSearch_filterSheetDescription],
  ['jobSearch_filteredEmptyText', m.jobSearch_filteredEmptyText],
  ['jobSearch_filtersLabel', m.jobSearch_filtersLabel],
  ['jobSearch_gatedCountText', m.jobSearch_gatedCountText],
  ['jobSearch_headingJobs', m.jobSearch_headingJobs],
  ['jobSearch_initialEmptyText', m.jobSearch_initialEmptyText],
  ['jobSearch_keywordLabel', m.jobSearch_keywordLabel],
  ['jobSearch_keywordPlaceholder', m.jobSearch_keywordPlaceholder],
  ['jobSearch_loadMoreLabel', m.jobSearch_loadMoreLabel],
  ['jobSearch_locationLabel', m.jobSearch_locationLabel],
  ['jobSearch_locationPlaceholder', m.jobSearch_locationPlaceholder],
  ['jobSearch_noJobsMatchText', m.jobSearch_noJobsMatchText],
  ['jobSearch_noMatchingResultsHeading', m.jobSearch_noMatchingResultsHeading],
  ['jobSearch_queryEmptyText', m.jobSearch_queryEmptyText],
  ['jobSearch_resetFiltersAction', m.jobSearch_resetFiltersAction],
  ['jobSearch_resetLabel', m.jobSearch_resetLabel],
  ['jobSearch_resultsCountMany', m.jobSearch_resultsCountMany],
  ['jobSearch_resultsCountOne', m.jobSearch_resultsCountOne],
  ['jobSearch_resultsRegionLabel', m.jobSearch_resultsRegionLabel],
  ['jobSearch_resultsShowingRange', m.jobSearch_resultsShowingRange],
  ['jobSearch_retryLabel', m.jobSearch_retryLabel],
  ['jobSearch_searchButtonLabel', m.jobSearch_searchButtonLabel],
  ['jobSearch_selectedJobRegionLabel', m.jobSearch_selectedJobRegionLabel],
  ['jobSearch_seniorityPlaceholder', m.jobSearch_seniorityPlaceholder],
  ['jobSearch_senioritySelectedCount', m.jobSearch_senioritySelectedCount],
  ['jobSearch_sortPlaceholder', m.jobSearch_sortPlaceholder],
  ['jobSearch_typePlaceholder', m.jobSearch_typePlaceholder],
  ['jobSearch_unlockMoreLabel', m.jobSearch_unlockMoreLabel],
  ['jobSearch_viewFullJobLabel', m.jobSearch_viewFullJobLabel],
  ['jobSearch_workplacePlaceholder', m.jobSearch_workplacePlaceholder],
  ['nav_blog', m.nav_blog],
  ['nav_companies', m.nav_companies],
  ['nav_home', m.nav_home],
  ['nav_post', m.nav_post],
  ['nav_pricing', m.nav_pricing],
  ['nav_talent', m.nav_talent],
  ['pagination_ariaLabel', m.pagination_ariaLabel],
  ['pagination_nextLabel', m.pagination_nextLabel],
  ['pagination_nextPageLabel', m.pagination_nextPageLabel],
  ['pagination_previousLabel', m.pagination_previousLabel],
  ['pagination_previousPageLabel', m.pagination_previousPageLabel],
  ['salary_basedOnLabel', m.salary_basedOnLabel],
  ['salary_boardBaselineLabel', m.salary_boardBaselineLabel],
  ['salary_comparisonHeadlineAverage', m.salary_comparisonHeadlineAverage],
  ['salary_comparisonPercentile25Label', m.salary_comparisonPercentile25Label],
  ['salary_comparisonPercentile75Label', m.salary_comparisonPercentile75Label],
  ['salary_faqHeading', m.salary_faqHeading],
  ['salary_medianLabel', m.salary_medianLabel],
  ['salary_perYearSuffix', m.salary_perYearSuffix],
  ['salary_seniorityTableHeaderAvg', m.salary_seniorityTableHeaderAvg],
  ['salary_seniorityTableHeaderDiff', m.salary_seniorityTableHeaderDiff],
  ['salary_seniorityTableHeaderLevel', m.salary_seniorityTableHeaderLevel],
] as const;

/**
 * The two parameterized catalog keys (positional callers) → their ICU
 * input name. Mirrors PARAM_KEYS in scripts/gen-paraglide-messages.mjs.
 */
const PARAM_KEYS: Record<string, string> = {
  jobDetail_experienceYears: 'years',
  jobDetail_posted: 'date',
};

/**
 * Catalog keys that are `{{token}}` TEMPLATES on the UiCopy contract
 * (callers resolve them at render, same as the hosted board and stored
 * operator overrides). The gen script emits their tokens as ICU inputs
 * (`{year}`), so feeding the mustache text back in as each input's value
 * reconstructs the verbatim template string in the active locale.
 */
const TEMPLATE_KEYS: Record<string, string[]> = {
  footer_copyrightPrefix: ['year', 'board_name'],
  footer_defaultDescription: ['board_name'],
};

/**
 * Catalog group → the stored config group its operator overrides live in.
 * Mirrors GROUP_OVERRIDE_SOURCE in @cavuno/board `format/ui-copy.ts` (not
 * exported there): the detail/apply/alerts/copy-link groups all read the
 * hosted `jobCardLabels` grab-bag — a fact of the hosted data model.
 */
const GROUP_OVERRIDE_SOURCE: Record<string, keyof BoardLabelOverrides> = {
  jobCard: 'jobCardLabels',
  jobSearch: 'jobSearchLabels',
  jobDetail: 'jobCardLabels',
  apply: 'jobCardLabels',
  alerts: 'jobCardLabels',
  copyLink: 'jobCardLabels',
  salary: 'salaryLabels',
  nav: 'navLabels',
  footer: 'footerLabels',
  breadcrumbs: 'breadcrumbsLabels',
  pagination: 'globalPaginationLabels',
  blog: 'blogSharedLabels',
  entity: 'entityLabels',
};

export function boardCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy {
  const copy: Record<string, Record<string, unknown>> = {};
  for (const [flatKey, message] of UI_COPY_MESSAGES) {
    const split = flatKey.indexOf('_');
    const group = flatKey.slice(0, split);
    const key = flatKey.slice(split + 1);
    const param = PARAM_KEYS[flatKey];
    const templateTokens = TEMPLATE_KEYS[flatKey];
    (copy[group] ??= {})[key] = param
      ? (value: unknown) => (message as MessageFn)({ [param]: value })
      : templateTokens
        ? (message as MessageFn)(
            Object.fromEntries(
              templateTokens.map((token) => [token, `{{${token}}}`]),
            ),
          )
        : (message as MessageFn)();
  }
  if (labels) {
    for (const [group, values] of Object.entries(copy)) {
      const overrides = labels[GROUP_OVERRIDE_SOURCE[group]!];
      if (!overrides) continue;
      for (const [key, value] of Object.entries(values)) {
        const override = overrides[key];
        if (
          typeof value === 'string' &&
          typeof override === 'string' &&
          override.trim() !== ''
        ) {
          values[key] = override;
        }
      }
    }
  }
  return copy as unknown as BoardCopy;
}
