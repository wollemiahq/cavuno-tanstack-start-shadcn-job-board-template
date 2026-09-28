import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('../../paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../paraglide/runtime')>()),
  getLocale: () => state.locale,
}));
// Match migrated content: owned prose has no placeholder marker. An
// untranslated locale may still contain the starter's scaffold.
vi.mock('./about', () => ({
  aboutContent: {
    en: { title: 'Our story', description: 'Owned content', Body: () => null },
    fr: { title: 'About', description: 'Owned', Body: () => null },
    es: { title: 'About', description: 'Owned', Body: () => null },
    pl: { title: 'About', description: 'Owned', Body: () => null },
    nl: { title: 'About', description: 'Owned', Body: () => null },
    de: {
      title: 'Über uns',
      description: 'Scaffold',
      placeholder: true,
      Body: () => null,
    },
  },
}));

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      middleware: () => builder,
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
    return builder;
  },
}));
vi.mock('../../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../../server/board-access', () => ({
  gatedRead: <TResult>(_context: Record<string, never>, read: () => TResult) =>
    read(),
}));
vi.mock('../../lib/board-context-cache', () => ({
  readBoardContext: async () => ({
    name: 'Example',
    language: 'en',
    features: { impressum: true },
  }),
}));
vi.mock('../../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://example.com',
}));

import { Route as AboutRoute } from '../../routes/about';
import { getLegalPageView } from '../../server/legal-pages';

// Exercise the real head construction and route propagation; only network
// access and the server-function transport are replaced.
describe('legal placeholder indexing', () => {
  it.each([
    ['en', false, 'owned content without a placeholder marker'],
    ['de', true, 'an untranslated scaffold'],
    ['unsupported', false, 'the English content fallback'],
  ] as const)('uses %s for %s (%s)', async (locale, noindex, _description) => {
    state.locale = locale;
    const data = await getLegalPageView({ data: { type: 'about' } });
    // SAFETY: this route's head reads only loaderData; the fixture is the
    // actual server result, and unrelated router context is not exercised.
    const headInput = { loaderData: data } as Parameters<
      NonNullable<typeof AboutRoute.options.head>
    >[0];
    const head = await AboutRoute.options.head!(headInput);
    const robots = { name: 'robots', content: 'noindex' };
    if (noindex) expect(head?.meta).toContainEqual(robots);
    else expect(head?.meta).not.toContainEqual(robots);
  });
});
