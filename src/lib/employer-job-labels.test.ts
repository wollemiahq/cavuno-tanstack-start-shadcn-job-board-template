import { describe, expect, it } from 'vitest';

import {
  employerJobStatusBadgeVariant,
  isEmployerJobExpired,
} from './employer-job-labels';

describe('employerJobStatusBadgeVariant', () => {
  it('keeps expired visually distinct from published and draft', () => {
    expect(employerJobStatusBadgeVariant('published')).toBe('default');
    expect(employerJobStatusBadgeVariant('expired')).toBe('outline');
    expect(employerJobStatusBadgeVariant('draft')).toBe('secondary');
    expect(employerJobStatusBadgeVariant('archived')).toBe('secondary');
  });
});

describe('isEmployerJobExpired', () => {
  const now = Date.parse('2026-07-20T00:00:00.000Z');

  it('treats an explicit expired status as expired', () => {
    expect(
      isEmployerJobExpired({ status: 'expired', expiresAt: null }, now),
    ).toBe(true);
  });

  it('flips a still-"published" job once its expiry has passed', () => {
    expect(
      isEmployerJobExpired(
        { status: 'published', expiresAt: '2026-07-01T00:00:00.000Z' },
        now,
      ),
    ).toBe(true);
  });

  it('leaves a live, unexpired published job alone', () => {
    expect(
      isEmployerJobExpired(
        { status: 'published', expiresAt: '2026-08-01T00:00:00.000Z' },
        now,
      ),
    ).toBe(false);
    expect(
      isEmployerJobExpired({ status: 'published', expiresAt: null }, now),
    ).toBe(false);
  });
});
