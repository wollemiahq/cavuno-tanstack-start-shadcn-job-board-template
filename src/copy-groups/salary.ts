import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['basedOnLabel', m.salary_basedOnLabel as unknown as MessageFn],
  ['boardBaselineLabel', m.salary_boardBaselineLabel as unknown as MessageFn],
  [
    'comparisonHeadlineAverage',
    m.salary_comparisonHeadlineAverage as unknown as MessageFn,
  ],
  [
    'comparisonPercentile25Label',
    m.salary_comparisonPercentile25Label as unknown as MessageFn,
  ],
  [
    'comparisonPercentile75Label',
    m.salary_comparisonPercentile75Label as unknown as MessageFn,
  ],
  ['faqHeading', m.salary_faqHeading as unknown as MessageFn],
  ['medianLabel', m.salary_medianLabel as unknown as MessageFn],
  ['perYearSuffix', m.salary_perYearSuffix as unknown as MessageFn],
  [
    'seniorityTableHeaderAvg',
    m.salary_seniorityTableHeaderAvg as unknown as MessageFn,
  ],
  [
    'seniorityTableHeaderDiff',
    m.salary_seniorityTableHeaderDiff as unknown as MessageFn,
  ],
  [
    'seniorityTableHeaderLevel',
    m.salary_seniorityTableHeaderLevel as unknown as MessageFn,
  ],
] as const;

export function salaryCopy(
  _language: string | undefined,
): BoardCopy['salary'] {
  return resolveCopyGroup(
    messages,
    undefined,
  ) as unknown as BoardCopy['salary'];
}
