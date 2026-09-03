import { describe, expect, it } from 'vitest';

import {
  companyDestination,
  jobDestination,
  talentDestination,
} from './master-detail-destination';

describe('master-detail destinations', () => {
  it('jobDestination encodes canonical detail, listing workspace, and selection key', () => {
    const dest = jobDestination({
      companySlug: 'acme',
      jobSlug: 'staff-engineer',
    });
    expect(dest.canonical).toEqual({
      to: '/companies/$companySlug/jobs/$jobSlug',
      params: { companySlug: 'acme', jobSlug: 'staff-engineer' },
    });
    expect(dest.listing).toEqual({
      to: '/jobs',
      search: { selectedJob: 'staff-engineer' },
    });
    expect(dest.selectionKey).toBe('staff-engineer');
  });

  it('companyDestination encodes canonical detail, listing workspace, and selection key', () => {
    const dest = companyDestination({ companySlug: 'acme' });
    expect(dest.canonical).toEqual({
      to: '/companies/$companySlug',
      params: { companySlug: 'acme' },
    });
    expect(dest.listing).toEqual({
      to: '/companies',
      search: { selectedCompany: 'acme' },
    });
    expect(dest.selectionKey).toBe('acme');
  });

  it('talentDestination encodes canonical profile, listing workspace, and selection key', () => {
    const dest = talentDestination({ handle: 'ada' });
    expect(dest.canonical).toEqual({
      to: '/p/$handle',
      params: { handle: 'ada' },
    });
    expect(dest.listing).toEqual({
      to: '/talent',
      search: { selectedTalent: 'ada' },
    });
    expect(dest.selectionKey).toBe('ada');
  });
});
