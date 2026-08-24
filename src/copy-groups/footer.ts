import { m } from '../paraglide/messages';

export function footerCopy() {
  return {
    aboutHeading: m.footer_aboutHeading(),
    aboutLabel: m.footer_aboutLabel(),
    allRightsReservedText: m.footer_allRightsReservedText(),
    contactLabel: m.footer_contactLabel(),
    cookiePolicyLabel: m.footer_cookiePolicyLabel(),
    copyrightPrefix: m.footer_copyrightPrefix({
      year: '{{year}}',
      board_name: '{{board_name}}',
    }),
    defaultDescription: m.footer_defaultDescription({
      board_name: '{{board_name}}',
    }),
    forCandidatesHeading: m.footer_forCandidatesHeading(),
    forCompaniesHeading: m.footer_forCompaniesHeading(),
    impressumLabel: m.footer_impressumLabel(),
    locationsLabel: m.footer_locationsLabel(),
    poweredByText: m.footer_poweredByText(),
    privacyPolicyLabel: m.footer_privacyPolicyLabel(),
    resourcesHeading: m.footer_resourcesHeading(),
    salariesLabel: m.footer_salariesLabel(),
    sitemapLabel: m.footer_sitemapLabel(),
    termsOfServiceLabel: m.footer_termsOfServiceLabel(),
    websiteLabel: m.footer_websiteLabel(),
  };
}
