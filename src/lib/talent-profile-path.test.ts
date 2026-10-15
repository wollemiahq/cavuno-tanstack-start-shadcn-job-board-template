import { describe, expect, it } from 'vitest';

import {
  talentProfileLink,
  talentProfileParam,
  talentProfilePath,
  talentProfilePaths,
} from './talent-profile-path';

describe('talent profile path', () => {
  it('serves profiles at /p/{handle} by default', () => {
    expect(talentProfilePath('ada-lovelace')).toBe('/p/ada-lovelace');
    expect(talentProfileLink('ada-lovelace')).toEqual({
      to: '/p/$handle',
      params: { handle: 'ada-lovelace' },
    });
  });

  it('encodes the param and reads it back', () => {
    expect(talentProfilePath('a b/c')).toBe('/p/a%20b%2Fc');
    expect(talentProfileParam('/p/a%20b%2Fc')).toBe('a b/c');
  });

  it('does not read other paths as a profile', () => {
    expect(talentProfileParam('/talent')).toBeNull();
    expect(talentProfileParam('/p/')).toBeNull();
    expect(talentProfileParam('/p/%E0')).toBeNull();
  });

  it('keeps fixed text around the handle unencoded after a move', () => {
    const moved = talentProfilePaths('/@{$handle}');
    expect(moved.path('ada-lovelace')).toBe('/@ada-lovelace');
    expect(moved.param('/@ada-lovelace')).toBe('ada-lovelace');
    expect(moved.param('/p/ada-lovelace')).toBeNull();

    // Moved under /talent, a profile path is one segment: the talent
    // location pages (/talent/locations/$location) are not profiles. A handle
    // spelled `locations` would read back as a profile here, but the router
    // matches the static /talent/locations route first.
    const underTalent = talentProfilePaths('/talent/{$handle}');
    expect(underTalent.param('/talent/locations/amsterdam')).toBeNull();
    expect(underTalent.param('/talent/a%2Fb')).toBe('a/b');

    const nested = talentProfilePaths('/candidates/{$handle}/cv');
    expect(nested.path('ada')).toBe('/candidates/ada/cv');
    expect(nested.param('/candidates/ada/cv')).toBe('ada');
  });
});
