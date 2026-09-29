import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), private: false }));
vi.mock('@tanstack/react-start', () => ({
  createServerOnlyFn: <TArgs extends readonly never[], TResult>(
    fn: (...args: TArgs) => TResult,
  ) => fn,
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      handler:
        <TData, TResult>(handler: (input: { data: TData }) => TResult) =>
        (input: { data: TData }) =>
          handler(input),
    };
    return chain;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://fixture.example'),
  setResponseHeader: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getPreviewBoard: () => ({ client: { fetch: mocks.fetch } }),
}));
vi.mock('../lib/data-source.server', () => ({
  isDemoBoardConfigured: () => true,
  isDemoBoardPrivate: () => mocks.private,
  getDataSource: () => 'demo',
  previewSessionSource: () => 'demo',
  serializeSessionForSource: vi.fn(),
}));
vi.mock('../lib/env', () => ({ getServerEnv: () => ({ devTools: true }) }));
vi.mock('./auth', () => ({ signOut: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
  mocks.fetch.mockReset();
  mocks.private = false;
});
async function handlers() {
  const module = await import('./preview');
  return [module.updateSandboxFlags, module.reseedSandbox] as const;
}
describe('sandbox mutation boundary', () => {
  it('rejects both shared demo mutations without any writes', async () => {
    mocks.fetch.mockResolvedValue({ personas: [] });
    const [update, reseed] = await handlers();
    expect(await update({ data: { config: {} } })).toMatchObject({ ok: false });
    expect(await reseed()).toMatchObject({ ok: false });
    expect(
      mocks.fetch.mock.calls.every(([, options]) => options === undefined),
    ).toBe(true);
  });
  it('capability failure rejects both handlers before writes', async () => {
    mocks.fetch.mockRejectedValue(new Error('offline'));
    const [update, reseed] = await handlers();
    expect(await update({ data: { config: {} } })).toMatchObject({
      ok: false,
      code: 'not-sandbox',
    });
    expect(await reseed()).toMatchObject({ ok: false, code: 'not-sandbox' });
    expect(
      mocks.fetch.mock.calls.every(([, options]) => options === undefined),
    ).toBe(true);
  });
  it('private demo permits configuration and reseed writes', async () => {
    mocks.private = true;
    mocks.fetch.mockResolvedValue({ personas: [] });
    const [update, reseed] = await handlers();
    expect(await update({ data: { config: {} } })).toEqual({ ok: true });
    expect(await reseed()).toEqual({ ok: true });
    expect(mocks.fetch).toHaveBeenCalledWith('/sandbox/config', {
      method: 'PATCH',
      body: { features: {} },
    });
    expect(mocks.fetch).toHaveBeenCalledWith('/sandbox/reseed', {
      method: 'POST',
    });
  });
});
