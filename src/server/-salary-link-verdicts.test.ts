import { BoardApiError } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  list: vi.fn(),
  title: vi.fn(),
  // A fresh data source per test keeps the settled verdict cache from
  // carrying one test's answer into the next.
  dataSource: { current: 'board-0' },
}));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: {
            data: TData;
            context: Record<string, never>;
          }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return chain;
  },
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture', language: 'en' }),
}));
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => mocks.dataSource.current,
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    taxonomy: { categories: { resolve: mocks.resolve } },
    jobs: { list: mocks.list },
    salaries: { titles: { retrieve: mocks.title } },
  }),
}));
import { getJobsCategoryPage } from './jobs-listing-pages';
import { jobsCategorySlug } from './salary-link-verdicts';

const notFound = () =>
  new BoardApiError({
    status: 404,
    code: 'not_found',
    message: 'Not found',
    raw: undefined,
  });

let run = 0;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mocks.dataSource.current = `board-${++run}`;
  mocks.resolve.mockResolvedValue({
    sourceSlug: 'fixture-role',
    canonicalSlug: 'fixture-role',
    displayName: 'Fixture role',
    redirectTo: null,
  });
  mocks.list.mockResolvedValue({ data: [], count: 0 });
});

function loadCategory() {
  return getJobsCategoryPage({
    data: { categorySlug: 'fixture-role', offset: 0, limit: 24 },
  });
}

function title(indexable: boolean) {
  return { canonicalSlug: 'fixture-role-salary', indexable };
}

describe('jobs category salary link verdict', () => {
  it("names the role's salary page when its own read says indexable", async () => {
    mocks.title.mockResolvedValue(title(true));
    expect(await loadCategory()).toMatchObject({
      kind: 'ok',
      salaryTitleSlug: 'fixture-role-salary',
    });
  });

  it('links nothing when the salary page is noindex or missing', async () => {
    mocks.title.mockResolvedValue(title(false));
    expect(await loadCategory()).toMatchObject({ salaryTitleSlug: null });

    mocks.dataSource.current = `board-${++run}`;
    mocks.title.mockRejectedValue(notFound());
    expect(await loadCategory()).toMatchObject({ salaryTitleSlug: null });
  });

  it('reads each title once, not once per page', async () => {
    mocks.title.mockResolvedValue(title(true));
    await loadCategory();
    await loadCategory();
    expect(mocks.title).toHaveBeenCalledTimes(1);
  });

  it('keeps the page on a failed read and does not retry it on every page', async () => {
    mocks.title.mockRejectedValue(new Error('salaries down'));
    expect(await loadCategory()).toMatchObject({
      kind: 'ok',
      salaryTitleSlug: null,
    });
    await loadCategory();
    expect(mocks.title).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

describe('role jobs page verdict', () => {
  it('links the canonical category, following a redirect', async () => {
    expect(await jobsCategorySlug('fixture-role', {})).toBe('fixture-role');

    mocks.dataSource.current = `board-${++run}`;
    mocks.resolve.mockResolvedValue({
      sourceSlug: 'fixture-alias',
      canonicalSlug: 'fixture-alias',
      displayName: 'Fixture role',
      redirectTo: 'fixture-role',
    });
    expect(await jobsCategorySlug('fixture-alias', {})).toBe('fixture-role');
  });

  it('links nothing when the category does not exist or the read fails', async () => {
    mocks.resolve.mockRejectedValue(notFound());
    expect(await jobsCategorySlug('no-category', {})).toBeNull();

    mocks.resolve.mockRejectedValue(new Error('taxonomy down'));
    expect(await jobsCategorySlug('other-role', {})).toBeNull();
  });
  it('renders without the link when the read stalls, and backs off', async () => {
    vi.useFakeTimers();
    try {
      mocks.resolve.mockReturnValue(new Promise(() => {}));
      const verdict = jobsCategorySlug('stalled-role', {});
      await vi.advanceTimersByTimeAsync(2_000);
      expect(await verdict).toBeNull();

      mocks.resolve.mockClear();
      expect(await jobsCategorySlug('stalled-role', {})).toBeNull();
      expect(mocks.resolve).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
