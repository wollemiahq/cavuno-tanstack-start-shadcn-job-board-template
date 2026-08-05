import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['aboutHeading', m.footer_aboutHeading as unknown as MessageFn],
  ['aboutLabel', m.footer_aboutLabel as unknown as MessageFn],
  [
    'allRightsReservedText',
    m.footer_allRightsReservedText as unknown as MessageFn,
  ],
  ['contactLabel', m.footer_contactLabel as unknown as MessageFn],
  ['cookiePolicyLabel', m.footer_cookiePolicyLabel as unknown as MessageFn],
  ['copyrightPrefix', m.footer_copyrightPrefix as unknown as MessageFn],
  ['defaultDescription', m.footer_defaultDescription as unknown as MessageFn],
  [
    'forCandidatesHeading',
    m.footer_forCandidatesHeading as unknown as MessageFn,
  ],
  ['forCompaniesHeading', m.footer_forCompaniesHeading as unknown as MessageFn],
  ['impressumLabel', m.footer_impressumLabel as unknown as MessageFn],
  ['locationsLabel', m.footer_locationsLabel as unknown as MessageFn],
  ['poweredByText', m.footer_poweredByText as unknown as MessageFn],
  ['privacyPolicyLabel', m.footer_privacyPolicyLabel as unknown as MessageFn],
  ['resourcesHeading', m.footer_resourcesHeading as unknown as MessageFn],
  ['salariesLabel', m.footer_salariesLabel as unknown as MessageFn],
  ['sitemapLabel', m.footer_sitemapLabel as unknown as MessageFn],
  ['termsOfServiceLabel', m.footer_termsOfServiceLabel as unknown as MessageFn],
  ['websiteLabel', m.footer_websiteLabel as unknown as MessageFn],
] as const;

export function footerCopy(_language: string | undefined): BoardCopy['footer'] {
  return resolveCopyGroup(
    messages,
    undefined,
    {},
    {
      copyrightPrefix: ['year', 'board_name'],
      defaultDescription: ['board_name'],
    },
  ) as unknown as BoardCopy['footer'];
}
