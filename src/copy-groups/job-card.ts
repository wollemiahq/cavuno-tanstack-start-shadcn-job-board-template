import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['aiRankedLabel', m.jobCard_aiRankedLabel as unknown as MessageFn],
  ['featuredLabel', m.jobCard_featuredLabel as unknown as MessageFn],
  [
    'relatedSearchesTitle',
    m.jobCard_relatedSearchesTitle as unknown as MessageFn,
  ],
  ['sortNewestLabel', m.jobCard_sortNewestLabel as unknown as MessageFn],
  [
    'sortSalaryHighLabel',
    m.jobCard_sortSalaryHighLabel as unknown as MessageFn,
  ],
] as const;

export function jobCardCopy(): BoardCopy['jobCard'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['jobCard'];
}
