import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['bylineLabel', m.blog_bylineLabel as unknown as MessageFn],
  ['clearButtonLabel', m.blog_clearButtonLabel as unknown as MessageFn],
  ['emptyDescription', m.blog_emptyDescription as unknown as MessageFn],
  ['emptyResetLabel', m.blog_emptyResetLabel as unknown as MessageFn],
  ['emptyTitle', m.blog_emptyTitle as unknown as MessageFn],
  ['readingTimeLabel', m.blog_readingTimeLabel as unknown as MessageFn],
  ['searchLabel', m.blog_searchLabel as unknown as MessageFn],
  ['searchPlaceholder', m.blog_searchPlaceholder as unknown as MessageFn],
  ['tagFilterAllLabel', m.blog_tagFilterAllLabel as unknown as MessageFn],
  ['tagFilterLabel', m.blog_tagFilterLabel as unknown as MessageFn],
] as const;

export function blogCopy(_language: string | undefined): BoardCopy['blog'] {
  return resolveCopyGroup(messages, undefined) as unknown as BoardCopy['blog'];
}
