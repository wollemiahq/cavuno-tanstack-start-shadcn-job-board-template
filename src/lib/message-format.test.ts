import { describe, expect, it } from 'vitest';

import {
  EDIT_WINDOW_MS,
  daySeparator,
  relativeTime,
  withinEditWindow,
} from './message-format';

const NOW = new Date('2026-07-01T12:00:00.000Z').getTime();

describe('relativeTime', () => {
  it('collapses sub-minute ages to "now" (inbox rows must not flicker seconds)', () => {
    expect(relativeTime('2026-07-01T11:59:30.000Z', NOW)).toBe('now');
  });

  it('uses compact m/h/d units within the last week', () => {
    expect(relativeTime('2026-07-01T11:45:00.000Z', NOW)).toBe('15m');
    expect(relativeTime('2026-07-01T09:00:00.000Z', NOW)).toBe('3h');
    expect(relativeTime('2026-06-29T12:00:00.000Z', NOW)).toBe('2d');
  });

  it('falls back to an absolute date past a week', () => {
    // Older than 7 days → not "8d"; must render a month/day label instead.
    expect(relativeTime('2026-06-01T12:00:00.000Z', NOW)).not.toMatch(/^\d+d$/);
  });
});

describe('withinEditWindow', () => {
  it('is the 15-minute rule that gates edit + unsend', () => {
    expect(EDIT_WINDOW_MS).toBe(15 * 60 * 1000);
    expect(withinEditWindow('2026-07-01T11:50:00.000Z', NOW)).toBe(true); // 10m
    expect(withinEditWindow('2026-07-01T11:44:00.000Z', NOW)).toBe(false); // 16m
  });
});

describe('daySeparator', () => {
  it('labels the current and prior calendar day by name, not by 24h age', () => {
    // Derive from `now` so the buckets are correct in any local timezone (the
    // separator groups by local calendar day, not by UTC).
    const DAY = 24 * 60 * 60 * 1000;
    expect(daySeparator(new Date(NOW).toISOString(), NOW)).toBe('Today');
    expect(daySeparator(new Date(NOW - DAY).toISOString(), NOW)).toBe(
      'Yesterday',
    );
  });
});
