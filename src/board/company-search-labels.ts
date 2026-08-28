import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { CompanySearchLabels } from './company-view-model';

export function getCompanySearchLabels(): CompanySearchLabels {
  return {
    noDescriptionText: m.companySearch_noDescriptionText(),
    markets: m.companySearch_marketLabel(),
    openJobs: (count) => {
      const locale = getLocale();
      return m.companyDetail_openJobsCount({
        count,
        countLabel: count.toLocaleString(locale),
      });
    },
    viewCompany: m.companySearch_viewCompanyLabel(),
    viewJobs: m.companySearch_viewJobsLabel(),
    viewSalaries: m.companyDetail_viewSalariesLink(),
    website: m.companyDetail_websiteLabel(),
  };
}
