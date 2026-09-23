import { describe, expect, it } from 'vitest';

import {
  COMPANY_FORM_BUILTINS,
  jobFormConstraintsForLayout,
  resolveJobFormLayout,
  resolveProfileFormLayout,
  type JobFormLayoutSource,
} from './form-layout';

import type {
  BoardJobFormField,
  BoardProfileFormField,
  CustomFieldDefinition,
} from '@cavuno/board';

function builtin(
  key: string,
  overrides: Partial<Extract<BoardJobFormField, { kind: 'builtin' }>> = {},
): Extract<BoardJobFormField, { kind: 'builtin' }> {
  return {
    kind: 'builtin',
    key,
    visible: true,
    required: false,
    locked: false,
    lockReason: null,
    ...overrides,
  };
}

const clearance: CustomFieldDefinition = {
  key: 'clearance',
  label: 'Security clearance',
  type: 'short_text',
  required: true,
};

const benefits = {
  key: 'benefits',
  label: 'Benefits',
  typeId: 'type-benefits',
  multiple: true,
  required: false,
  maxSelections: 5,
};

function keys(entries: ReadonlyArray<{ kind: string; key: string }>) {
  return entries.map((entry) => `${entry.kind}:${entry.key}`);
}

describe('resolveJobFormLayout', () => {
  it('renders the layout in its order, custom and collection fields at their positions', () => {
    const source: JobFormLayoutSource = {
      forms: {
        job: [
          builtin('title', { locked: true, lockReason: 'google_required' }),
          {
            kind: 'custom',
            key: 'clearance',
            visible: true,
            required: true,
            definition: clearance,
          },
          builtin('description', {
            locked: true,
            lockReason: 'google_required',
          }),
          {
            kind: 'collection',
            key: 'benefits',
            visible: true,
            required: false,
            definition: benefits,
          },
          builtin('salary', { required: true }),
        ],
      },
    };

    expect(keys(resolveJobFormLayout(source, [clearance]))).toEqual([
      'builtin:title',
      'custom:clearance',
      'builtin:description',
      'collection:benefits',
      'builtin:salary',
    ]);
  });

  it('omits hidden fields, and a hidden field is never required', () => {
    const entries = resolveJobFormLayout(
      {
        forms: {
          job: [
            builtin('seniority', { visible: false }),
            {
              kind: 'custom',
              key: 'clearance',
              visible: false,
              required: false,
              definition: clearance,
            },
            {
              kind: 'collection',
              key: 'benefits',
              visible: false,
              required: false,
              definition: benefits,
            },
            builtin('salary'),
          ],
        },
      },
      [clearance],
    );

    expect(keys(entries)).toEqual(['builtin:salary']);
  });

  it('always shows a locked built-in and requires it', () => {
    const [title] = resolveJobFormLayout(
      {
        forms: {
          job: [
            builtin('title', {
              visible: false,
              required: false,
              locked: true,
              lockReason: 'google_required',
            }),
          ],
        },
      },
      [],
    );

    expect(title).toEqual({
      kind: 'builtin',
      key: 'title',
      required: true,
      locked: true,
    });
  });

  it('skips a built-in key the starter does not know', () => {
    const entries = resolveJobFormLayout(
      { forms: { job: [builtin('hologram'), builtin('title')] } },
      [],
    );

    expect(keys(entries)).toEqual(['builtin:title']);
  });

  it('skips an entry kind the starter does not know, on every form', () => {
    // A kind a newer API may send before the starter learns to draw it,
    // parsed from the wire as the SDK would hand it over.
    const section: BoardJobFormField & BoardProfileFormField = JSON.parse(
      '{"kind":"section","key":"intro","visible":true,"required":false}',
    );

    expect(
      keys(
        resolveJobFormLayout(
          { forms: { job: [section, builtin('title')] } },
          [],
        ),
      ),
    ).toEqual(['builtin:title']);
    expect(
      keys(
        resolveProfileFormLayout(
          [section, builtin('name')],
          COMPANY_FORM_BUILTINS,
          { customFields: [], collectionFields: [] },
        ),
      ),
    ).toEqual(['builtin:name']);
  });

  it('falls back to the pre-layout order, legacy visibility and the custom fields when forms is absent', () => {
    const entries = resolveJobFormLayout(
      {
        object: 'public_board',
        jobForm: {
          salary: { visible: false },
          seniority: { visible: true, required: true },
        },
      },
      [clearance],
    );

    expect(keys(entries)).toEqual([
      'builtin:company',
      'builtin:employmentType',
      'builtin:seniority',
      'builtin:title',
      'builtin:workArrangement',
      'builtin:location',
      'builtin:remoteEligibility',
      'builtin:description',
      'builtin:applyMethod',
      'custom:clearance',
    ]);
    expect(entries.find((entry) => entry.key === 'seniority')?.required).toBe(
      true,
    );
  });
});

describe('jobFormConstraintsForLayout', () => {
  it('takes salary and seniority visibility and required state from the layout', () => {
    const source: JobFormLayoutSource = {
      jobForm: {
        salary: { visible: true, required: false, minBound: 10 },
        seniority: { visible: true, required: true },
      },
      forms: {
        job: [
          builtin('salary', { required: true }),
          builtin('seniority', { visible: false }),
        ],
      },
    };

    const constraints = jobFormConstraintsForLayout(
      source,
      resolveJobFormLayout(source, []),
    );

    expect(constraints.salary).toMatchObject({ visible: true, required: true });
    expect(constraints.seniority).toMatchObject({
      visible: false,
      required: false,
    });
    expect(constraints.location.visible).toBe(false);
  });
});

describe('resolveProfileFormLayout', () => {
  const publicTier = {
    key: 'tier',
    label: 'Member tier',
    type: 'single_select' as const,
    required: true,
    visibility: 'public' as const,
    editableByOwner: true,
    options: [{ key: 'gold', label: 'Gold' }],
  };
  const operatorOnly = {
    ...publicTier,
    key: 'rating',
    label: 'Rating',
    editableByOwner: false,
  };
  const privateNote = {
    ...publicTier,
    key: 'internal_id',
    label: 'Membership number',
    type: 'short_text' as const,
    required: false,
    visibility: 'private' as const,
  };
  const layout: BoardProfileFormField[] = [
    {
      kind: 'custom',
      key: 'tier',
      visible: true,
      required: true,
      definition: publicTier,
    },
    builtin('name', { locked: true, lockReason: 'google_hiring_organization' }),
    {
      kind: 'custom',
      key: 'rating',
      visible: true,
      required: true,
      definition: operatorOnly,
    },
    builtin('summary', { visible: false }),
    builtin('website', { required: true }),
  ];

  it('renders the layout in order, only owner-editable fields as inputs, then private editable fields', () => {
    const entries = resolveProfileFormLayout(layout, COMPANY_FORM_BUILTINS, {
      customFields: [publicTier, operatorOnly, privateNote],
      collectionFields: [],
    });

    expect(keys(entries)).toEqual([
      'custom:tier',
      'builtin:name',
      'builtin:website',
      'custom:internal_id',
    ]);
    expect(entries.find((entry) => entry.key === 'website')?.required).toBe(
      true,
    );
  });

  it('keeps a public field the operator hid out of the form, even from the owner read', () => {
    const entries = resolveProfileFormLayout(
      [
        {
          kind: 'custom',
          key: 'tier',
          visible: false,
          required: false,
          definition: publicTier,
        },
      ],
      COMPANY_FORM_BUILTINS,
      { customFields: [publicTier], collectionFields: [] },
    );

    expect(keys(entries)).toEqual([]);
  });

  it('leaves custom and collection fields out when the owner reads did not answer', () => {
    const memberships = {
      key: 'memberships',
      label: 'Memberships',
      typeId: 'type-memberships',
      multiple: true,
      visibility: 'public' as const,
      editableByOwner: true,
      allowOverrides: false,
    };
    const entries = resolveProfileFormLayout(
      [
        ...layout,
        {
          kind: 'collection',
          key: 'memberships',
          visible: true,
          required: false,
          definition: memberships,
        },
      ],
      COMPANY_FORM_BUILTINS,
      null,
    );

    expect(keys(entries)).toEqual(['builtin:name', 'builtin:website']);
  });

  it('falls back to the pre-layout built-ins, then the editable fields, when forms is absent', () => {
    const entries = resolveProfileFormLayout(
      null,
      COMPANY_FORM_BUILTINS,
      { customFields: [privateNote, operatorOnly], collectionFields: [] },
      { fallbackRequired: ['name'] },
    );

    expect(keys(entries)).toEqual([
      ...COMPANY_FORM_BUILTINS.map((key) => `builtin:${key}`),
      'custom:internal_id',
    ]);
    expect(entries.find((entry) => entry.key === 'name')?.required).toBe(true);
  });
});
