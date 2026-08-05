import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['ariaLabel', m.pagination_ariaLabel as unknown as MessageFn],
  ['nextLabel', m.pagination_nextLabel as unknown as MessageFn],
  ['nextPageLabel', m.pagination_nextPageLabel as unknown as MessageFn],
  ['previousLabel', m.pagination_previousLabel as unknown as MessageFn],
  ['previousPageLabel', m.pagination_previousPageLabel as unknown as MessageFn],
] as const;

export function paginationCopy(
  _language: string | undefined,
): BoardCopy['pagination'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['pagination'];
}
