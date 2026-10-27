import { formatDistance } from '@cavuno/board/format';
import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { distanceAwayLabel } from './distance-away';

describe('distanceAwayLabel', () => {
  it('rounds to a whole unit', () => {
    expect(distanceAwayLabel(12.4, 'km', 'en')).toBe(
      m.searchRadius_distanceAway(
        { distance: formatDistance(12, 'km', 'en') },
        { locale: 'en' },
      ),
    );
  });

  it('shows the place unit', () => {
    // 16.1 km is 10 mi.
    expect(distanceAwayLabel(16.1, 'mi', 'en')).toBe(
      m.searchRadius_distanceAway(
        { distance: formatDistance(10, 'mi', 'en') },
        { locale: 'en' },
      ),
    );
  });

  it('reads under one unit as less than one', () => {
    expect(distanceAwayLabel(0.4, 'km', 'en')).toBe(
      m.searchRadius_distanceUnderOneAway(
        { distance: formatDistance(1, 'km', 'en') },
        { locale: 'en' },
      ),
    );
  });

  it('is empty without a distance or a unit', () => {
    expect(distanceAwayLabel(null, 'km', 'en')).toBeNull();
    expect(distanceAwayLabel(12, null, 'en')).toBeNull();
  });
});
