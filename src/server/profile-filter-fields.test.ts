import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileCustomFilters } from './profile-filter-fields';

const retrieve = vi.fn();

vi.mock('../lib/board', () => ({
  getBoard: () => ({ profileFields: { retrieve } }),
}));

const headers = { 'x-board-access': 'grant' };

beforeEach(() => {
  retrieve.mockReset();
  retrieve.mockResolvedValue({
    definitions: [
      {
        key: 'stage',
        label: 'Stage',
        type: 'single_select',
        required: false,
        visibility: 'public',
        editableByOwner: true,
        options: [
          { key: 'seed', label: 'Seed' },
          { key: 'growth', label: 'Growth' },
        ],
      },
      {
        key: 'internal_flag',
        label: 'Internal',
        type: 'boolean',
        required: false,
        visibility: 'private',
        editableByOwner: false,
      },
    ],
    referenceDefinitions: [],
  });
});

describe('profileCustomFilters', () => {
  it('reads the entity definitions with the request headers', async () => {
    const custom = await profileCustomFilters('company', undefined, headers);

    expect(retrieve).toHaveBeenCalledWith('company', { headers });
    expect(custom.clauses).toBeUndefined();
    await expect(custom.fields).resolves.toEqual([
      {
        kind: 'choice',
        key: 'stage',
        label: 'Stage',
        options: [
          { value: 'seed', label: 'Seed' },
          { value: 'growth', label: 'Growth' },
        ],
      },
    ]);
  });

  it('sends only URL values that the live public definitions accept', async () => {
    const custom = await profileCustomFilters(
      'company',
      {
        'cf.stage': 'growth,ipo',
        'cf.internal_flag': true,
        'cf.deleted': 'x',
      },
      headers,
    );

    expect(custom.clauses).toEqual([{ key: 'stage', values: ['growth'] }]);
  });

  it('sends no clause when nothing in the URL is still valid', async () => {
    const custom = await profileCustomFilters(
      'candidate',
      { 'cf.stage': 'ipo' },
      headers,
    );

    expect(custom.clauses).toBeUndefined();
  });

  it('renders the listing without the section when definitions cannot load', async () => {
    retrieve.mockRejectedValue(new Error('upstream unavailable'));

    const custom = await profileCustomFilters(
      'candidate',
      { 'cf.stage': 'seed' },
      headers,
    );

    expect(custom.clauses).toBeUndefined();
    await expect(custom.fields).resolves.toEqual([]);
  });
});
