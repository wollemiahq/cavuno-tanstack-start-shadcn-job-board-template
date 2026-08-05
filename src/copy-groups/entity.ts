import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['companyPlural', m.entity_companyPlural as unknown as MessageFn],
  ['companySingular', m.entity_companySingular as unknown as MessageFn],
  ['jobPlural', m.entity_jobPlural as unknown as MessageFn],
  ['jobSingular', m.entity_jobSingular as unknown as MessageFn],
] as const;

export function entityCopy(_language: string | undefined): BoardCopy['entity'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['entity'];
}
