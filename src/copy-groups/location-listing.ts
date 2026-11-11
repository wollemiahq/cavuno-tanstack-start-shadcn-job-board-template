import { m } from '../paraglide/messages';

import type { CountedHeading } from '@/lib/listing-description';
import {
  isWorkArrangementSlug,
  type WorkArrangementSlug,
} from '@/lib/work-arrangement';

type ListingCopy = { heading: string; countedHeading: CountedHeading };

type MessageKey = 'remote' | 'hybrid' | 'onSite';

const MESSAGE_KEY = {
  remote: 'remote',
  hybrid: 'hybrid',
  'on-site': 'onSite',
} as const satisfies Record<WorkArrangementSlug, MessageKey>;

const PAGE = {
  remote: [
    m.workArrangementPage_remoteJobsHeading,
    m.workArrangementPage_remoteJobsCountHeading,
  ],
  hybrid: [
    m.workArrangementPage_hybridJobsHeading,
    m.workArrangementPage_hybridJobsCountHeading,
  ],
  onSite: [
    m.workArrangementPage_onSiteJobsHeading,
    m.workArrangementPage_onSiteJobsCountHeading,
  ],
} as const;

const CATEGORY = {
  remote: [
    m.workArrangementCategoryPage_remoteJobsHeading,
    m.workArrangementCategoryPage_remoteJobsCountHeading,
  ],
  hybrid: [
    m.workArrangementCategoryPage_hybridJobsHeading,
    m.workArrangementCategoryPage_hybridJobsCountHeading,
  ],
  onSite: [
    m.workArrangementCategoryPage_onSiteJobsHeading,
    m.workArrangementCategoryPage_onSiteJobsCountHeading,
  ],
} as const;

const SKILL = {
  remote: [
    m.workArrangementSkillPage_remoteJobsHeading,
    m.workArrangementSkillPage_remoteJobsCountHeading,
  ],
  hybrid: [
    m.workArrangementSkillPage_hybridJobsHeading,
    m.workArrangementSkillPage_hybridJobsCountHeading,
  ],
  onSite: [
    m.workArrangementSkillPage_onSiteJobsHeading,
    m.workArrangementSkillPage_onSiteJobsCountHeading,
  ],
} as const;

/**
 * The heading of a location listing (`/jobs/locations/<slug>`), with and
 * without its count. A place reads "Jobs in Berlin"; a work arrangement
 * slug reads as the arrangement ("Remote jobs"), never as a place.
 */
export function locationListingCopy(
  locationSlug: string,
  place: { displayName: string },
): ListingCopy {
  if (isWorkArrangementSlug(locationSlug)) {
    const [heading, counted] = PAGE[MESSAGE_KEY[locationSlug]];
    return { heading: heading(), countedHeading: (input) => counted(input) };
  }
  return {
    heading: m.locationPage_jobsHeading({ place: place.displayName }),
    countedHeading: (input) =>
      m.locationPage_jobsCountHeading({ ...input, place: place.displayName }),
  };
}

/** A location + category listing's heading; see `locationListingCopy`. */
export function locationCategoryListingCopy(
  locationSlug: string,
  place: { displayName: string },
  category: { displayName: string },
): ListingCopy {
  if (isWorkArrangementSlug(locationSlug)) {
    const [heading, counted] = CATEGORY[MESSAGE_KEY[locationSlug]];
    return {
      heading: heading({ category: category.displayName }),
      countedHeading: (input) =>
        counted({ ...input, category: category.displayName }),
    };
  }
  return {
    heading: m.locationCategoryPage_jobsHeading({
      category: category.displayName,
      place: place.displayName,
    }),
    countedHeading: (input) =>
      m.locationCategoryPage_jobsCountHeading({
        ...input,
        category: category.displayName,
        place: place.displayName,
      }),
  };
}

/** A location + skill listing's heading; see `locationListingCopy`. */
export function locationSkillListingCopy(
  locationSlug: string,
  place: { displayName: string },
  skill: { displayName: string },
): ListingCopy {
  if (isWorkArrangementSlug(locationSlug)) {
    const [heading, counted] = SKILL[MESSAGE_KEY[locationSlug]];
    return {
      heading: heading({ skill: skill.displayName }),
      countedHeading: (input) =>
        counted({ ...input, skill: skill.displayName }),
    };
  }
  return {
    heading: m.locationSkillPage_jobsHeading({
      skill: skill.displayName,
      place: place.displayName,
    }),
    countedHeading: (input) =>
      m.locationSkillPage_jobsCountHeading({
        ...input,
        skill: skill.displayName,
        place: place.displayName,
      }),
  };
}
