import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { CompanySearchLabels } from './company-view-model';

export function getCompanySearchLabels(): CompanySearchLabels {
  return {
    noDescriptionText: m.companySearch_noDescriptionText(),
    markets: m.companySearch_marketLabel(),
    openJobs: (count) => {
      const locale = getLocale();
      const formatted = count.toLocaleString(locale);
      return new Intl.PluralRules(locale).select(count) === 'one'
        ? m.companyDetail_openJobsCountOne({ count: formatted })
        : m.companyDetail_openJobsCountMany({ count: formatted });
    },
    viewCompany: m.companySearch_viewCompanyLabel(),
    viewJobs: m.companySearch_viewJobsLabel(),
    viewSalaries: m.companyDetail_viewSalariesLink(),
    website: m.footer_websiteLabel(),
  };
}
