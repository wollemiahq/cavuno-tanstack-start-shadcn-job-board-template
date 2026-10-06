import { beforeEach, describe, expect, it, vi } from 'vitest';
type ImpressumFixture = {
  sourceLanguage: string;
  locales: Record<string, { title: string; description: string; html: string }>;
};
const mocks = vi.hoisted(() => {
  const impressum: ImpressumFixture = { sourceLanguage: 'en', locales: {} };
  return { board: vi.fn(), origin: vi.fn(), impressum };
});
vi.mock('../content/legal/impressum.json', () => ({
  default: mocks.impressum,
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
  readBoardContext: mocks.board,
}));
vi.mock('../lib/public-origin', () => ({ readPublicOrigin: mocks.origin }));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(_context: Record<string, never>, read: () => TResult) =>
    read(),
}));
import { impressumAvailable } from '../content/legal/impressum-availability';
import { getLegalPageView } from './legal-pages';
const OPERATOR_IMPRESSUM = {
  title: 'Impressum',
  description: 'Operator legal notice',
  html: '<p>Operator GmbH</p>',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.impressum.locales = { en: OPERATOR_IMPRESSUM };
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
  it('enabled Impressum without operator content is not published', async () => {
    mocks.impressum.locales = {};
    mocks.board.mockResolvedValue({
      name: 'Fixture',
      language: 'en',
      features: { impressum: true },
    });
    await expect(
      getLegalPageView({ data: { type: 'impressum' } }),
    ).rejects.toMatchObject({
      isNotFound: true,
    });
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
      page: { type: 'impressum', html: '<p>Operator GmbH</p>' },
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
  it('publishes an impressum written only in another language', async () => {
    mocks.impressum.locales = { de: OPERATOR_IMPRESSUM };
    mocks.board.mockResolvedValue({
      name: 'Fixture',
      language: 'en',
      features: { impressum: true },
    });
    expect(impressumAvailable({ impressum: true })).toBe(true);
    expect(
      await getLegalPageView({ data: { type: 'impressum' } }),
    ).toMatchObject({
      page: { type: 'impressum', html: '<p>Operator GmbH</p>' },
    });
  });
});
