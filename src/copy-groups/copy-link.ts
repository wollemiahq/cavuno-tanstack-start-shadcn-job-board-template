import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type BoardLabelOverrides,
  type CopyOverrides,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['ariaLabel', m.copyLink_ariaLabel as unknown as MessageFn],
  ['copiedLabel', m.copyLink_copiedLabel as unknown as MessageFn],
  ['copyLinkLabel', m.copyLink_copyLinkLabel as unknown as MessageFn],
] as const;

export function copyLinkCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy['copyLink'] {
  return resolveCopyGroup(
    messages,
    labels?.jobCardLabels as CopyOverrides | undefined,
  ) as unknown as BoardCopy['copyLink'];
}
