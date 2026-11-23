import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardAccessContext } from '../lib/board-access-middleware';

const mocks = vi.hoisted(() => ({
  readBoardContext: vi.fn(),
  myApplication: vi.fn(),
  requireVerifiedBoardUser: vi.fn(),
}));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: {
            data: TData | undefined;
            context: unknown;
          }) => TResult,
        ) =>
        (input?: { data: TData }) =>
          handler({
            data: input?.data,
            context: { authHeaders: {}, boardAccessHeaders: {} },
          }),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: vi.fn(),
  setCookie: vi.fn(),
  setResponseHeader: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({ jobs: { myApplication: mocks.myApplication } }),
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: mocks.readBoardContext,
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/session-middleware', () => ({ requireSessionMiddleware: {} }));
vi.mock('./board-access', () => ({
  gatedRead: <T>(
    context: BoardAccessContext,
    read: (headers: Record<string, string>) => Promise<T>,
  ) => read(context.boardAccessHeaders),
}));
vi.mock('./me-verification', () => ({
  requireVerifiedBoardUser: mocks.requireVerifiedBoardUser,
}));
vi.mock('./native-apply', () => ({}));
import { myApplicationForJob } from './applications';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.myApplication.mockResolvedValue({ id: 'application-1' });
});

describe('myApplicationForJob', () => {
  it('skips the Board API lookup on a board with native applications off', async () => {
    mocks.readBoardContext.mockResolvedValue({
      features: { nativeApplications: false },
    });

    const result = await myApplicationForJob({
      data: { jobSlug: 'platform-engineer' },
    });

    expect(result).toBeNull();
    expect(mocks.myApplication).not.toHaveBeenCalled();
  });

  it('looks up the application when the flag is absent (default on)', async () => {
    mocks.readBoardContext.mockResolvedValue({ features: {} });

    const result = await myApplicationForJob({
      data: { jobSlug: 'platform-engineer' },
    });

    expect(result).toEqual({ id: 'application-1' });
    expect(mocks.myApplication).toHaveBeenCalledWith('platform-engineer', {
      headers: {},
    });
  });
});
