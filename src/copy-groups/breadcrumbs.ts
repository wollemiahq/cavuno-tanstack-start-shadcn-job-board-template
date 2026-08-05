import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['about', m.breadcrumbs_about as unknown as MessageFn],
  ['blog', m.breadcrumbs_blog as unknown as MessageFn],
  ['companies', m.breadcrumbs_companies as unknown as MessageFn],
  ['cookiePolicy', m.breadcrumbs_cookiePolicy as unknown as MessageFn],
  ['home', m.breadcrumbs_home as unknown as MessageFn],
  ['impressum', m.breadcrumbs_impressum as unknown as MessageFn],
  ['jobs', m.breadcrumbs_jobs as unknown as MessageFn],
  ['locations', m.breadcrumbs_locations as unknown as MessageFn],
  ['post', m.breadcrumbs_post as unknown as MessageFn],
  ['pricing', m.breadcrumbs_pricing as unknown as MessageFn],
  ['privacyPolicy', m.breadcrumbs_privacyPolicy as unknown as MessageFn],
  ['salaries', m.breadcrumbs_salaries as unknown as MessageFn],
  ['skills', m.breadcrumbs_skills as unknown as MessageFn],
  ['talent', m.breadcrumbs_talent as unknown as MessageFn],
  ['termsOfService', m.breadcrumbs_termsOfService as unknown as MessageFn],
  ['titles', m.breadcrumbs_titles as unknown as MessageFn],
] as const;

export function breadcrumbsCopy(
  _language: string | undefined,
): BoardCopy['breadcrumbs'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['breadcrumbs'];
}
