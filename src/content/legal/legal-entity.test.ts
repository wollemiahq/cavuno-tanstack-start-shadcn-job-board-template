import { describe, expect, it } from 'vitest';

import { resolveLegalEntity } from './index';

/**
 * Hosted stores the operator's registered company name as `companyLegalName`
 * and shows it on the impressum. Before SDK 4.13.0 the starter had no way to
 * read it, so a migrated board fell back to the static `legalEntity` in
 * `types.ts` — which ships as `null` — and 71 boards would have lost the name.
 */
describe('resolveLegalEntity', () => {
  it('takes the legal name from the board context', () => {
    expect(resolveLegalEntity('Example Recruitment GmbH')).toEqual({
      legalName: 'Example Recruitment GmbH',
      address: null,
    });
  });

  it('ignores a blank or missing context name', () => {
    // The static fallback ships as null, so there is nothing left to show and
    // the facts card must be omitted rather than rendering an empty box.
    expect(resolveLegalEntity('   ')).toBeNull();
    expect(resolveLegalEntity(null)).toBeNull();
    expect(resolveLegalEntity(undefined)).toBeNull();
    expect(resolveLegalEntity()).toBeNull();
  });
});
