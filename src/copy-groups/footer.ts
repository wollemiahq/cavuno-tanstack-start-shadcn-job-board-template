import { chromeFooter } from '../lib/site-chrome';
import { m } from '../paraglide/messages';

/**
 * Footer chrome copy: the operator's baked `chrome.json` overrides win over the
 * Paraglide catalog, mirroring nav/entity. Overrides may carry `{{board_name}}`
 * / `{{year}}` handlebars — `Footer.tsx` resolves those the same way it does
 * for the catalog's own templated strings.
 */
export function footerCopy() {
  const chrome = chromeFooter().labels;
  return {
    aboutHeading: chrome.aboutHeading ?? m.footer_aboutHeading(),
    aboutLabel: chrome.aboutLabel ?? m.footer_aboutLabel(),
    allRightsReservedText:
      chrome.allRightsReservedText ?? m.footer_allRightsReservedText(),
    contactLabel: chrome.contactLabel ?? m.footer_contactLabel(),
    cookiePolicyLabel: chrome.cookiePolicyLabel ?? m.footer_cookiePolicyLabel(),
    copyrightPrefix:
      chrome.copyrightPrefix ??
      m.footer_copyrightPrefix({
        year: '{{year}}',
        board_name: '{{board_name}}',
      }),
    defaultDescription: m.footer_defaultDescription({
      board_name: '{{board_name}}',
    }),
    forCandidatesHeading:
      chrome.forCandidatesHeading ?? m.footer_forCandidatesHeading(),
    forCompaniesHeading:
      chrome.forCompaniesHeading ?? m.footer_forCompaniesHeading(),
    impressumLabel: chrome.impressumLabel ?? m.footer_impressumLabel(),
    locationsLabel: chrome.locationsLabel ?? m.footer_locationsLabel(),
    poweredByText: chrome.poweredByText ?? m.footer_poweredByText(),
    privacyPolicyLabel:
      chrome.privacyPolicyLabel ?? m.footer_privacyPolicyLabel(),
    resourcesHeading: chrome.resourcesHeading ?? m.footer_resourcesHeading(),
    salariesLabel: chrome.salariesLabel ?? m.footer_salariesLabel(),
    sitemapLabel: chrome.sitemapLabel ?? m.footer_sitemapLabel(),
    termsOfServiceLabel:
      chrome.termsOfServiceLabel ?? m.footer_termsOfServiceLabel(),
    websiteLabel: chrome.websiteLabel ?? m.footer_websiteLabel(),
  };
}
