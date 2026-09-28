import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ board: vi.fn(), origin: vi.fn() }));
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
  readBoardContext: mocks.board,
}));
vi.mock('../lib/public-origin', () => ({ readPublicOrigin: mocks.origin }));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(_context: Record<string, never>, read: () => TResult) =>
    read(),
}));
import { getLegalPageView } from './legal-pages';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.origin.mockResolvedValue('https://fixture.example');
});
describe('direct legal page feature gate', () => {
  it('disabled Impressum rejects before origin and metadata construction', async () => {
    mocks.board.mockResolvedValue({ features: { impressum: false } });
    await expect(
      getLegalPageView({ data: { type: 'impressum' } }),
    ).rejects.toMatchObject({
      isNotFound: true,
    });
    expect(mocks.origin).not.toHaveBeenCalled();
  });
  it('enabled Impressum returns page and metadata', async () => {
    mocks.board.mockResolvedValue({
      name: 'Fixture',
      language: 'en',
      features: { impressum: true },
    });
    expect(
      await getLegalPageView({ data: { type: 'impressum' } }),
    ).toMatchObject({
      page: { type: 'impressum' },
      head: expect.any(Object),
    });
  });
  it('disabled Impressum does not disable other legal pages', async () => {
    mocks.board.mockResolvedValue({
      name: 'Fixture',
      language: 'en',
      features: { impressum: false },
    });
    expect(
      await getLegalPageView({ data: { type: 'privacy-policy' } }),
    ).toMatchObject({
      page: { type: 'privacy-policy' },
    });
  });
});
