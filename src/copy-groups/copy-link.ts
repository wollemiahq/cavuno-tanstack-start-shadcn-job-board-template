import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['ariaLabel', m.copyLink_ariaLabel as unknown as MessageFn],
  ['copiedLabel', m.copyLink_copiedLabel as unknown as MessageFn],
  ['copyLinkLabel', m.copyLink_copyLinkLabel as unknown as MessageFn],
] as const;

export function copyLinkCopy(): BoardCopy['copyLink'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['copyLink'];
}
