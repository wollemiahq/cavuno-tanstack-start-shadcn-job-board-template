import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';
import {
  jobsIndexPageTitle,
  listingMetaDescription,
  listingPageTitle,
} from './listing-description';
import {
  headTitle,
  jobTitleAtCompany,
  pageTitle,
  TITLE_SEPARATOR,
} from './page-title';

import type { LocalizedString } from '../paraglide/runtime';

// SAFETY: these controlled messages stand in for branded compiler output.
const localized = (value: string) => value as LocalizedString;
afterEach(() => vi.restoreAllMocks());

describe('route-owned document titles', () => {
  it('includes supplied title parts and the resolved board without fixing their presentation', () => {
    const title = headTitle('Fixture board', 'Fixture page', 'Fixture section');
    for (const part of ['Fixture board', 'Fixture page', 'Fixture section'])
      expect(title).toContain(part);
  });

  it('ignores missing parts and does not invent an unresolved board name', () => {
    expect(pageTitle(['', null, ' Fixture page ', undefined], null)).toBe(
      'Fixture page',
    );
    expect(headTitle(undefined, 'Fixture page')).toBe('Fixture page');
  });

  it('does not duplicate a board suffix already supplied by the author', () => {
    const authored = `Fixture page${TITLE_SEPARATOR}Fixture board`;
    expect(pageTitle([authored], 'Fixture board')).toBe(authored);
    expect(pageTitle(['Fixture board'], 'Fixture board')).toBe('Fixture board');
  });

  it('passes job and company data to the chosen catalog message', () => {
    const message = vi
      .spyOn(m, 'jobDetailHead_titleAtCompany')
      .mockReturnValue(localized('Title fixture'));
    expect(jobTitleAtCompany('en', 'Role fixture', 'Company fixture')).toBe(
      'Title fixture',
    );
    expect(message).toHaveBeenCalledWith(
      { title: 'Role fixture', company: 'Company fixture' },
      { locale: 'en' },
    );
  });

  it('keeps the job title when the company is unavailable', () => {
    expect(jobTitleAtCompany('en', 'Role fixture', null)).toBe('Role fixture');
  });

  it.each([0, 1, 1225])(
    'supplies the raw count %s to catalog plural selection',
    (count) => {
      const message = vi
        .spyOn(m, 'jobSearch_resultsCount')
        .mockReturnValue(localized('Results fixture'));
      const title = jobsIndexPageTitle({
        boardName: 'Fixture board',
        language: 'en',
        count,
      });
      expect(title).toContain('Results fixture');
      expect(title).toContain('Fixture board');
      expect(message).toHaveBeenCalledWith(
        { count, countLabel: expect.any(String) },
        { locale: 'en' },
      );
    },
  );

  it('uses the uncounted heading when the result count is unavailable', () => {
    const heading = vi
      .spyOn(m, 'jobSearch_headingJobs')
      .mockReturnValue(localized('Heading fixture'));
    const count = vi.spyOn(m, 'jobSearch_resultsCount');
    expect(
      jobsIndexPageTitle({ boardName: 'Fixture board', language: 'en' }),
    ).toContain('Heading fixture');
    expect(heading).toHaveBeenCalledWith({}, { locale: 'en' });
    expect(count).not.toHaveBeenCalled();
  });

  it.each([1, 1225])(
    'titles and describes a listing with its counted heading for %s',
    (count) => {
      const countedHeading = vi.fn(
        ({ count: raw, countLabel }: { count: number; countLabel: string }) =>
          `counted:${raw}:${countLabel}`,
      );
      const label = new Intl.NumberFormat('en').format(count);
      expect(
        listingPageTitle({
          heading: 'Fixture heading',
          countedHeading,
          boardName: 'Fixture board',
          language: 'en',
          count,
        }),
      ).toContain(`counted:${count}:${label}`);
      expect(
        listingMetaDescription({
          heading: 'Fixture heading',
          countedHeading,
          boardName: 'Fixture board',
          count,
        }),
      ).toContain(`counted:${count}:`);
    },
  );
});
