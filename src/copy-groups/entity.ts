import { chromeEntity } from '../lib/site-chrome';
import { m } from '../paraglide/messages';

export function entityCopy() {
  const chrome = chromeEntity();
  return {
    companyPlural: chrome.companyPlural ?? m.entity_companyPlural(),
    companySingular: chrome.companySingular ?? m.entity_companySingular(),
    jobPlural: chrome.jobPlural ?? m.entity_jobPlural(),
    jobSingular: chrome.jobSingular ?? m.entity_jobSingular(),
    candidateSingular: chrome.candidateSingular ?? m.entity_candidateSingular(),
    candidatePlural: chrome.candidatePlural ?? m.entity_candidatePlural(),
    // Hosted calls this `candidatePresent`: the open end of a date range on a
    // candidate profile ("2021 — Present"). One noun, so one override, rather
    // than the three separate keys the experience, education and public
    // profile sections each used to carry.
    candidatePresent: chrome.candidatePresent ?? m.entity_candidatePresent(),
  };
}
