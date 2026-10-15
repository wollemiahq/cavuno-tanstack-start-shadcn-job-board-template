import { BoardApiError } from '@cavuno/board';
import { isNotFound, isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  createTalentLocationLoader,
  createTalentLocationsIndexLoader,
} from './-talent-loaders';

import type * as TalentPages from '../server/talent-pages';

// Like `/jobs/locations/$location`: an alias slug 308s (a redirect without a
// status code is a temporary 307, which tells crawlers the alias is
// canonical), and an unknown place or a board without a directory 404s.

async function settle<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    return error;
  }
}

describe('talent location loaders', () => {
  it('308s a non-canonical place slug to the canonical one', async () => {
    const loadPage = vi.fn<typeof TalentPages.getTalentLocationPage>();
    loadPage.mockResolvedValue({ kind: 'redirect' as const, to: 'zuerich' });
    const result = await settle(() =>
      createTalentLocationLoader(loadPage)({
        params: { location: 'zurich' },
        deps: { within: 10, page: 2 },
      }),
    );
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error('Expected a redirect');
    expect(result.options).toMatchObject({
      to: '/talent/locations/$location',
      params: { location: 'zuerich' },
      statusCode: 308,
    });
    expect(loadPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationSlug: 'zurich',
        within: 10,
        offset: 24,
      }),
    });
  });

  it('404s an unknown place', async () => {
    const loadPage = vi.fn<typeof TalentPages.getTalentLocationPage>();
    loadPage.mockResolvedValue({ kind: 'not_found' as const });
    const result = await settle(() =>
      createTalentLocationLoader(loadPage)({
        params: { location: 'nowhere' },
        deps: {},
      }),
    );
    expect(isNotFound(result)).toBe(true);
  });

  it('404s the directory page when the board has no talent directory', async () => {
    const loadPage = vi.fn<typeof TalentPages.getTalentLocationsIndexPage>();
    loadPage.mockRejectedValue(
      new BoardApiError({
        status: 404,
        code: 'talent_directory_not_found',
        message: 'Not Found',
        raw: undefined,
      }),
    );
    const result = await settle(() =>
      createTalentLocationsIndexLoader(loadPage)(),
    );
    expect(isNotFound(result)).toBe(true);
  });
});
