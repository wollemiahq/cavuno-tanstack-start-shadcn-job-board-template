import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type BoardLabelOverrides,
  type CopyOverrides,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['emailAriaLabel', m.alerts_emailAriaLabel as unknown as MessageFn],
  ['jobAlertButtonText', m.alerts_jobAlertButtonText as unknown as MessageFn],
  [
    'jobAlertEmailPlaceholder',
    m.alerts_jobAlertEmailPlaceholder as unknown as MessageFn,
  ],
  ['jobAlertErrorToast', m.alerts_jobAlertErrorToast as unknown as MessageFn],
  [
    'jobAlertSuccessToast',
    m.alerts_jobAlertSuccessToast as unknown as MessageFn,
  ],
  ['jobAlertTitle', m.alerts_jobAlertTitle as unknown as MessageFn],
  ['sectionAriaLabel', m.alerts_sectionAriaLabel as unknown as MessageFn],
  ['submitAriaLabel', m.alerts_submitAriaLabel as unknown as MessageFn],
  ['subscribingLabel', m.alerts_subscribingLabel as unknown as MessageFn],
] as const;

export function alertsCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy['alerts'] {
  return resolveCopyGroup(
    messages,
    labels?.jobCardLabels as CopyOverrides | undefined,
  ) as unknown as BoardCopy['alerts'];
}
