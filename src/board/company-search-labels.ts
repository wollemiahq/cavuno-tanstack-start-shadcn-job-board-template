import { m } from '../paraglide/messages';

import type { CompanySearchLabels } from './company-view-model';

export function getCompanySearchLabels(): CompanySearchLabels {
  return {
    noDescriptionText: m.companySearch_noDescriptionText(),
    markets: m.companySearch_marketLabel(),
    openJobs: (count) =>
      count === 1
        ? m.companyDetail_openJobsCountOne({ count })
        : m.companyDetail_openJobsCountMany({ count }),
    viewCompany: m.companySearch_viewCompanyLabel(),
    viewJobs: m.companySearch_viewJobsLabel(),
    viewSalaries: m.companyDetail_viewSalariesLink(),
    website: m.footer_websiteLabel(),
  };
}
