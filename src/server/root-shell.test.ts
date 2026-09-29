import { beforeEach, describe, expect, it, vi } from 'vitest';
type ShellTestContext = {
  session: Record<string, never> | null;
  boardAccessHeaders: Record<string, string>;
};
const mocks = vi.hoisted(() => {
  const context: ShellTestContext = { session: null, boardAccessHeaders: {} };
  return {
    context,
    fresh: vi.fn(),
    stale: vi.fn(),
    seo: vi.fn(),
    offer: vi.fn(),
    contact: vi.fn(),
    me: vi.fn(),
    grant: vi.fn(),
    companies: vi.fn(),
    preview: vi.fn(),
  };
});
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      middleware: () => chain,
      handler:
        <TResult>(
          handler: (input: { context: typeof mocks.context }) => TResult,
        ) =>
        () =>
          handler({ context: mocks.context }),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://fixture.example/page'),
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/env', () => ({
  getServerEnv: () => ({ board: 'pk_fixture' }),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    me: { retrieve: mocks.me, access: { grant: mocks.grant } },
    companies: { list: mocks.companies },
  }),
}));
vi.mock('./preview', () => ({ resolvePreviewStateForViewer: mocks.preview }));
vi.mock('./contact', () => ({ getContactForRoot: mocks.contact }));
vi.mock('./queries', () => ({
  getFreshBoardContext: mocks.fresh,
  getStaleBoardContext: mocks.stale,
  getBoardSeo: mocks.seo,
  getEmployerOfferGate: mocks.offer,
}));
vi.mock('./talent-access', () => ({ EMPTY_GRANT: {} }));
import { getRootShellData, getRootSessionShellData } from './root-shell';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context = { session: null, boardAccessHeaders: {} };
  mocks.fresh.mockResolvedValue({ name: 'Fixture board' });
  mocks.seo.mockResolvedValue({ canonicalBase: 'https://fixture.example' });
  mocks.offer.mockResolvedValue({ visible: true });
  mocks.contact.mockResolvedValue({
    object: 'board_contact',
    enabled: true,
    boardName: 'Fixture board',
  });
});
describe('public and session shells', () => {
  it('public document exposes only public fields without viewer reads', async () => {
    expect(await getRootShellData()).toEqual({
      origin: 'https://fixture.example',
      publishableKey: 'pk_fixture',
      board: { name: 'Fixture board' },
      seo: { canonicalBase: 'https://fixture.example' },
      offerGate: { visible: true },
      contact: {
        object: 'board_contact',
        enabled: true,
        boardName: 'Fixture board',
      },
    });
    expect(mocks.me).not.toHaveBeenCalled();
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('anonymous session makes no viewer calls', async () => {
    expect(await getRootSessionShellData()).toEqual({ user: null });
    expect(mocks.me).not.toHaveBeenCalled();
  });
  it('authenticated chrome reads only identity with access headers', async () => {
    const headers = { 'x-board-access': 'fixture' };
    mocks.me.mockResolvedValue({ id: 'viewer' });
    mocks.context = { session: {}, boardAccessHeaders: headers };
    expect(await getRootSessionShellData()).toEqual({ user: { id: 'viewer' } });
    expect(mocks.me).toHaveBeenCalledWith(undefined, { headers });
    expect(mocks.companies).not.toHaveBeenCalled();
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('identity failure returns anonymous chrome', async () => {
    mocks.me.mockRejectedValue(new Error('offline'));
    mocks.context = { session: {}, boardAccessHeaders: {} };
    expect(await getRootSessionShellData()).toEqual({ user: null });
  });
});
