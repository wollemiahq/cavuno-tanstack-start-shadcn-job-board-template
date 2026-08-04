import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['blog', m.nav_blog as unknown as MessageFn],
  ['companies', m.nav_companies as unknown as MessageFn],
  ['home', m.nav_home as unknown as MessageFn],
  ['post', m.nav_post as unknown as MessageFn],
  ['pricing', m.nav_pricing as unknown as MessageFn],
  ['talent', m.nav_talent as unknown as MessageFn],
] as const;

export function navCopy(
  _language: string | undefined,
): BoardCopy['nav'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['nav'];
}
