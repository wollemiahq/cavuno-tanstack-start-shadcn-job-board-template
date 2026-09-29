import { describe, expect, it, vi } from 'vitest';

import { boardErrorMessage } from './lib/board-error-message';
import { m } from './paraglide/messages';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      middleware: () => builder,
      handler:
        <TData, TResult>(
          handler: (input: { data: TData; context: object }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return builder;
  },
}));
vi.mock('./lib/board-access-middleware', () => ({ boardAccessMiddleware: {} }));
vi.mock('./server/board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('./lib/board', () => ({ getBoard: vi.fn() }));

import { getBoard } from './lib/board';
import { uploadLogo } from './server/post';

describe('post-job upload feedback', () => {
  it('returns a recoverable code for a missing image before calling the SDK', async () => {
    const result = await uploadLogo({ data: new FormData() });
    expect(result).toMatchObject({ ok: false, code: 'invalid_file' });
    expect(getBoard).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid_file', m.postJob_chooseImageError],
    ['job_posting_logo_not_found', m.postJob_logoNotFoundError],
  ] as const)(
    'resolves %s through the viewer message catalog',
    (code, message) => {
      expect(
        boardErrorMessage({ code, message: 'server transport text' }),
      ).toBe(message());
    },
  );
});
