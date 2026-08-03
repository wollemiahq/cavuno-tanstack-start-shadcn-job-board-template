import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type BoardLabelOverrides,
  type CopyOverrides,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  [
    'applicationSubmitError',
    m.apply_applicationSubmitError as unknown as MessageFn,
  ],
  [
    'appliedViewApplicationsLabel',
    m.apply_appliedViewApplicationsLabel as unknown as MessageFn,
  ],
  ['applyButtonText', m.apply_applyButtonText as unknown as MessageFn],
  [
    'applyOnEmployerSiteLabel',
    m.apply_applyOnEmployerSiteLabel as unknown as MessageFn,
  ],
  ['applyingLabel', m.apply_applyingLabel as unknown as MessageFn],
  ['signInToApplyLabel', m.apply_signInToApplyLabel as unknown as MessageFn],
  [
    'verifyEmailToApplyLabel',
    m.apply_verifyEmailToApplyLabel as unknown as MessageFn,
  ],
] as const;

export function applyCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy['apply'] {
  return resolveCopyGroup(
    messages,
    labels?.jobCardLabels as CopyOverrides | undefined,
  ) as unknown as BoardCopy['apply'];
}
