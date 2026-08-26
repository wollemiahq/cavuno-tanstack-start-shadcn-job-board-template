import { chromeEntity } from '../lib/site-chrome';
import { m } from '../paraglide/messages';

export function entityCopy() {
  const chrome = chromeEntity();
  return {
    companyPlural: chrome.companyPlural ?? m.entity_companyPlural(),
    companySingular: chrome.companySingular ?? m.entity_companySingular(),
    jobPlural: chrome.jobPlural ?? m.entity_jobPlural(),
    jobSingular: chrome.jobSingular ?? m.entity_jobSingular(),
  };
}
