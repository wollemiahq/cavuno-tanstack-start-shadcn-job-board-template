import { m } from '../paraglide/messages';

export function entityCopy() {
  return {
    companyPlural: m.entity_companyPlural(),
    companySingular: m.entity_companySingular(),
    jobPlural: m.entity_jobPlural(),
    jobSingular: m.entity_jobSingular(),
  };
}
