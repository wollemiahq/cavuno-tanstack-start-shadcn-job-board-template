import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardCopy } from './copy';
import { entityCopy } from './copy-groups/entity';
import { navCopy } from './copy-groups/nav';
import { chromeEntity, chromeNav } from './lib/site-chrome';
import { m } from './paraglide/messages';

import type { LocalizedString } from './paraglide/runtime';

// Exercise adapter wiring with controlled messages and overrides, independent
// of the board owner's wording and chrome configuration.
vi.mock('./lib/site-chrome', () => ({
  chromeNav: vi.fn(() => ({})),
  chromeEntity: vi.fn(() => ({})),
  chromeFooter: vi.fn(() => ({ labels: {} })),
}));

// SAFETY: controlled test messages stand in for the compiler's branded output.
const localized = (value: string) => value as LocalizedString;

describe('localized copy adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(chromeNav).mockReturnValue({});
    vi.mocked(chromeEntity).mockReturnValue({});
  });

  it('uses the message resolver without passing the legacy board language', () => {
    const label = vi
      .spyOn(m, 'jobCard_featuredLabel')
      .mockReturnValue(localized('Localized badge'));
    expect(boardCopy('de').jobCard.featuredLabel).toBe('Localized badge');
    expect(boardCopy('fr').jobCard.featuredLabel).toBe('Localized badge');
    expect(label).toHaveBeenCalledWith();
  });

  it('forwards positional parameters to localized messages', () => {
    const years = vi
      .spyOn(m, 'jobDetail_experienceYears')
      .mockReturnValue(localized('Experience fixture'));
    const posted = vi
      .spyOn(m, 'jobDetail_posted')
      .mockReturnValue(localized('Date fixture'));
    expect(boardCopy('en').jobDetail.experienceYears(5)).toBe(
      'Experience fixture',
    );
    expect(years).toHaveBeenCalledWith({ years: 5 });
    expect(boardCopy('en').jobDetail.posted('today')).toBe('Date fixture');
    expect(posted).toHaveBeenCalledWith({ date: 'today' });
  });

  it('passes reusable placeholders and the general plural selector to catalog messages', () => {
    const results = vi
      .spyOn(m, 'jobSearch_resultsCount')
      .mockReturnValue(localized('Count fixture'));
    const range = vi
      .spyOn(m, 'jobSearch_resultsShowingRange')
      .mockReturnValue(localized('Range fixture'));
    const copyright = vi
      .spyOn(m, 'footer_copyrightPrefix')
      .mockReturnValue(localized('Copyright fixture'));
    const copy = boardCopy('en');
    expect(copy.jobSearch.resultsCount).toBe('Count fixture');
    expect(results).toHaveBeenCalledWith({ count: 0, countLabel: '{{count}}' });
    expect(copy.jobSearch.resultsShowingRange).toBe('Range fixture');
    expect(range).toHaveBeenCalledWith({
      from: '{{from}}',
      to: '{{to}}',
      count: 0,
      countLabel: '{{count}}',
    });
    expect(copy.footer.copyrightPrefix).toBe('Copyright fixture');
    expect(copyright).toHaveBeenCalledWith({
      year: '{{year}}',
      board_name: '{{board_name}}',
    });
  });

  it('uses catalog defaults and lets configured nav/entity labels override them', () => {
    vi.spyOn(m, 'nav_home').mockReturnValue(localized('Catalog navigation'));
    vi.spyOn(m, 'entity_jobSingular').mockReturnValue(
      localized('Catalog entity'),
    );
    expect(navCopy().home).toBe('Catalog navigation');
    expect(entityCopy().jobSingular).toBe('Catalog entity');

    vi.mocked(chromeNav).mockReturnValue({ home: 'Opportunities' });
    vi.mocked(chromeEntity).mockReturnValue({ jobSingular: 'opportunity' });
    expect(navCopy().home).toBe('Opportunities');
    expect(entityCopy().jobSingular).toBe('opportunity');
  });
});
