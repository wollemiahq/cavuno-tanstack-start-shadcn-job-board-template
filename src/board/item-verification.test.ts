import { describe, expect, it } from 'vitest';

import {
  canCheckByEmail,
  canRequestVerification,
  checksByEmail,
  collectionVerifiableItems,
  educationVerifiableItem,
  experienceVerifiableItem,
  verificationsByKey,
} from './item-verification';

import type { ItemVerification, ProfileObjectReferences } from '@cavuno/board';

function verification(
  itemKey: string,
  status: ItemVerification['status'],
): ItemVerification {
  return {
    id: `iv_${itemKey}`,
    object: 'item_verification',
    itemKey,
    status,
    lapseReason: null,
    reasonCode: null,
    verifiedAt: null,
    expiresAt: null,
    hasProof: false,
    verifiedDomain: null,
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

function list(...rows: ItemVerification[]) {
  return verificationsByKey({ data: rows });
}

function selection(
  fieldKey: string,
  recordId: string,
  title: string,
  entries: { key: string; values: Record<string, string> }[] = [],
): ProfileObjectReferences['selections'][number] {
  return {
    fieldKey,
    fieldLabel: fieldKey,
    recordId,
    title,
    fields: [],
    attributes: {},
    valueDefinitions: [],
    entryDefinitions: [],
    values: {},
    entries,
  };
}

describe('built-in item verification', () => {
  const job = {
    id: 'exp1',
    companyName: 'Acme',
    companyUrl: 'https://acme.com',
    endDate: null,
  };

  const school = { id: 'edu1', institutionName: 'MIT', institutionUrl: null };

  it('shows nothing when the board does not verify the type', () => {
    expect(experienceVerifiableItem(job, null)).toBeNull();
    expect(educationVerifiableItem(school, null)).toBeNull();
  });

  it('shows every entry as unverified when the board verifies the type and the API lists no row', () => {
    expect(experienceVerifiableItem(job, list())).toMatchObject({
      itemKey: 'experience:exp1',
      verification: null,
    });
    expect(educationVerifiableItem(school, list())).toMatchObject({
      itemKey: 'education:edu1',
      method: 'team',
      verification: null,
    });
    expect(canRequestVerification(null)).toBe(true);
  });

  it('checks a current job with a website by work email, and a past job by the team', () => {
    const rows = list(
      verification('experience:exp1', 'changed'),
      verification('experience:exp2', 'rejected'),
    );
    expect(experienceVerifiableItem(job, rows)).toMatchObject({
      itemKey: 'experience:exp1',
      method: 'email_domain',
      emailDomain: 'acme.com',
    });
    expect(
      experienceVerifiableItem(
        { ...job, id: 'exp2', endDate: '2024-01-01' },
        rows,
      ),
    ).toMatchObject({ method: 'team' });
  });

  it('checks education with a website by school email', () => {
    expect(
      educationVerifiableItem(
        { ...school, institutionUrl: 'https://www.mit.edu/' },
        list(),
      ),
    ).toMatchObject({ method: 'email_domain', emailDomain: 'mit.edu' });
  });

  it('lets the worker ask again only from a status the API accepts', () => {
    expect(canRequestVerification(null)).toBe(true);
    expect(canRequestVerification({ status: 'needs_info' })).toBe(true);
    expect(canRequestVerification({ status: 'lapsed' })).toBe(true);
    expect(canRequestVerification({ status: 'pending' })).toBe(false);
    expect(canRequestVerification({ status: 'verified' })).toBe(false);
    expect(canRequestVerification({ status: 'revoked' })).toBe(false);
    expect(canRequestVerification({ status: 'rejected' })).toBe(false);
  });

  it('starts an email check only from a status the API accepts for it', () => {
    expect(canCheckByEmail(null)).toBe(true);
    for (const status of [
      'unverified',
      'changed',
      'lapsed',
      'unable_to_verify',
    ] as const) {
      expect(canCheckByEmail({ status })).toBe(true);
    }
    for (const status of [
      'rejected',
      'needs_info',
      'pending',
      'verified',
      'revoked',
    ] as const) {
      expect(canCheckByEmail({ status })).toBe(false);
    }
  });
});

describe('the API next step', () => {
  it('decides when present, over the status', () => {
    expect(
      canRequestVerification({ status: 'needs_info', nextStep: 'none' }),
    ).toBe(false);
    expect(
      canRequestVerification({ status: 'rejected', nextStep: 'team' }),
    ).toBe(true);
    expect(canCheckByEmail({ status: 'needs_info', nextStep: 'email' })).toBe(
      true,
    );
    expect(canCheckByEmail({ status: 'unverified', nextStep: 'team' })).toBe(
      false,
    );
  });

  it('checks by email by the next step, else by method and status', () => {
    const row = (nextStep?: 'email' | 'team' | 'none') => ({
      ...verification('experience:exp1', 'unverified'),
      nextStep,
    });
    expect(checksByEmail({ method: 'team', verification: row('email') })).toBe(
      true,
    );
    expect(
      checksByEmail({ method: 'email_domain', verification: row('team') }),
    ).toBe(false);
    expect(checksByEmail({ method: 'email_domain', verification: row() })).toBe(
      true,
    );
    expect(checksByEmail({ method: 'team', verification: row() })).toBe(false);
    expect(checksByEmail({ method: 'email_domain', verification: null })).toBe(
      true,
    );
  });
});

describe('collectionVerifiableItems', () => {
  const definition = {
    key: 'licences',
    label: 'Licences',
    typeId: 'type_1',
    multiple: true,
    visibility: 'public' as const,
    editableByOwner: true,
    allowOverrides: false,
  };

  it('lists nothing when no field has verification set up', () => {
    expect(
      collectionVerifiableItems(
        {
          definitions: [definition],
          selections: [selection('licences', 'rec1', 'Electrician')],
        },
        list(),
        { emailDomain: true },
      ),
    ).toEqual([]);
    expect(
      collectionVerifiableItems(null, list(), { emailDomain: true }),
    ).toEqual([]);
  });

  it('keys a selection without entries, and each entry when the field has them', () => {
    const references: ProfileObjectReferences = {
      definitions: [
        {
          ...definition,
          verification: {
            checkedFieldKeys: ['number'],
            validity: { kind: 'never' },
            verifiedBy: 'email_domain',
            domainSource: { from: 'list', domains: ['example.org'] },
            required: false,
          },
        },
        {
          ...definition,
          key: 'cards',
          entryDefinitions: [
            {
              key: 'number',
              label: 'Number',
              type: 'short_text',
              required: false,
              visibility: 'public',
              editableByOwner: true,
            },
          ],
          verification: {
            checkedFieldKeys: ['number'],
            validity: { kind: 'recheck', months: 12 },
            verifiedBy: 'team',
            required: true,
          },
        },
      ],
      selections: [
        selection('licences', 'rec1', 'Electrician'),
        selection('cards', 'rec2', 'Site card', [
          { key: 'e1', values: { number: 'A-123' } },
        ]),
      ],
    };

    const items = collectionVerifiableItems(
      references,
      list(verification('ref:cards:rec2:e1', 'pending')),
      { emailDomain: true },
    );
    expect(items).toEqual([
      {
        itemKey: 'ref:licences:rec1',
        label: 'Electrician',
        method: 'email_domain',
        verification: null,
      },
      {
        itemKey: 'ref:cards:rec2:e1',
        label: 'Site card: A-123',
        method: 'team',
        verification: expect.objectContaining({ status: 'pending' }),
      },
    ]);
    // Company profiles have no email check, so every item goes to the team.
    expect(
      collectionVerifiableItems(references, list(), { emailDomain: false })[0]
        ?.method,
    ).toBe('team');
  });
});
