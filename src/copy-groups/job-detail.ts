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
    'aboutCompanyHeading',
    m.jobDetail_aboutCompanyHeading as unknown as MessageFn,
  ],
  [
    'additionalDetailsHeading',
    m.jobDetail_additionalDetailsHeading as unknown as MessageFn,
  ],
  [
    'breadcrumbAriaLabel',
    m.jobDetail_breadcrumbAriaLabel as unknown as MessageFn,
  ],
  ['categoriesHeading', m.jobDetail_categoriesHeading as unknown as MessageFn],
  [
    'customFieldNoLabel',
    m.jobDetail_customFieldNoLabel as unknown as MessageFn,
  ],
  [
    'customFieldYesLabel',
    m.jobDetail_customFieldYesLabel as unknown as MessageFn,
  ],
  ['educationLabel', m.jobDetail_educationLabel as unknown as MessageFn],
  ['experienceLabel', m.jobDetail_experienceLabel as unknown as MessageFn],
  ['experienceYears', m.jobDetail_experienceYears as unknown as MessageFn],
  [
    'locationNotSpecifiedLabel',
    m.jobDetail_locationNotSpecifiedLabel as unknown as MessageFn,
  ],
  ['locationsLabel', m.jobDetail_locationsLabel as unknown as MessageFn],
  ['noDescriptionText', m.jobDetail_noDescriptionText as unknown as MessageFn],
  [
    'noExperienceRequiredLabel',
    m.jobDetail_noExperienceRequiredLabel as unknown as MessageFn,
  ],
  ['posted', m.jobDetail_posted as unknown as MessageFn],
  ['sidebarAriaLabel', m.jobDetail_sidebarAriaLabel as unknown as MessageFn],
  [
    'similarJobsHeading',
    m.jobDetail_similarJobsHeading as unknown as MessageFn,
  ],
  ['skillsHeading', m.jobDetail_skillsHeading as unknown as MessageFn],
  ['timezonesLabel', m.jobDetail_timezonesLabel as unknown as MessageFn],
  [
    'viewCompanyProfileLabel',
    m.jobDetail_viewCompanyProfileLabel as unknown as MessageFn,
  ],
  ['workPermitsLabel', m.jobDetail_workPermitsLabel as unknown as MessageFn],
  ['worldwideLabel', m.jobDetail_worldwideLabel as unknown as MessageFn],
] as const;

export function jobDetailCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy['jobDetail'] {
  return resolveCopyGroup(
    messages,
    labels?.jobCardLabels as CopyOverrides | undefined,
    {
      experienceYears: 'years',
      posted: 'date',
    },
  ) as unknown as BoardCopy['jobDetail'];
}
