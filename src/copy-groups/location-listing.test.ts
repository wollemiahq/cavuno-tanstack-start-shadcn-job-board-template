import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import {
  locationCategoryListingCopy,
  locationListingCopy,
  locationSkillListingCopy,
} from './location-listing';

const counted = { count: 3, countLabel: '3' };
// The resolution's name for a work arrangement is its label; the page must
// not read it as a place ("Jobs in Remote").
const arrangementPlace = { displayName: 'Fixture arrangement' };
const place = { displayName: 'Fixture Town' };
const category = { displayName: 'Fixture Category' };
const skill = { displayName: 'Fixture Skill' };

describe('location listing wording', () => {
  it('names a work arrangement page by its arrangement', () => {
    const copy = locationListingCopy('remote', arrangementPlace);
    expect(copy.heading).toBe(m.workArrangementPage_remoteJobsHeading());
    expect(copy.countedHeading(counted)).toBe(
      m.workArrangementPage_remoteJobsCountHeading(counted),
    );
    expect(locationListingCopy('hybrid', arrangementPlace).heading).toBe(
      m.workArrangementPage_hybridJobsHeading(),
    );
    expect(
      locationListingCopy('on-site', arrangementPlace).countedHeading(counted),
    ).toBe(m.workArrangementPage_onSiteJobsCountHeading(counted));
  });

  it('names an arrangement combination by its arrangement and term', () => {
    const byCategory = locationCategoryListingCopy(
      'remote',
      arrangementPlace,
      category,
    );
    expect(byCategory.heading).toBe(
      m.workArrangementCategoryPage_remoteJobsHeading({
        category: category.displayName,
      }),
    );
    expect(byCategory.countedHeading(counted)).toBe(
      m.workArrangementCategoryPage_remoteJobsCountHeading({
        ...counted,
        category: category.displayName,
      }),
    );
    const bySkill = locationSkillListingCopy(
      'on-site',
      arrangementPlace,
      skill,
    );
    expect(bySkill.heading).toBe(
      m.workArrangementSkillPage_onSiteJobsHeading({
        skill: skill.displayName,
      }),
    );
    expect(bySkill.heading).not.toContain(arrangementPlace.displayName);
  });

  it('keeps place wording for a real place', () => {
    const copy = locationListingCopy('fixture-town', place);
    expect(copy.heading).toBe(
      m.locationPage_jobsHeading({ place: place.displayName }),
    );
    expect(copy.countedHeading(counted)).toBe(
      m.locationPage_jobsCountHeading({
        ...counted,
        place: place.displayName,
      }),
    );
    expect(
      locationCategoryListingCopy('fixture-town', place, category).heading,
    ).toBe(
      m.locationCategoryPage_jobsHeading({
        category: category.displayName,
        place: place.displayName,
      }),
    );
    expect(locationSkillListingCopy('fixture-town', place, skill).heading).toBe(
      m.locationSkillPage_jobsHeading({
        skill: skill.displayName,
        place: place.displayName,
      }),
    );
  });
});
