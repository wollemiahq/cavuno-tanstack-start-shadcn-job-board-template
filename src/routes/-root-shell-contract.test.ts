import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { Route } from './__root';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  HeadContent: () => null,
  Scripts: () => null,
}));
vi.mock('@/components/alternate-links', () => ({
  AlternateLinks: ({ origin }: { origin: string }) =>
    createElement('link', {
      rel: 'alternate',
      href: `${origin}/fixture-locale`,
    }),
}));
vi.mock('@/components/client-error-reporting-boot', () => ({
  ClientErrorReportingBoot: () => null,
}));
describe('root shell contract', () => {
  it('renders the shell from route context before loader data is available', () => {
    vi.spyOn(Route, 'useRouteContext').mockReturnValue({
      origin: 'https://fixture.example',
    });
    vi.spyOn(Route, 'useLoaderData').mockImplementation(() => {
      throw new Error('Loader has not resolved');
    });
    // SAFETY: __root defines shellComponent as a component accepting children; the server-side route option augmentation is absent from this client test's route type.
    const options = Route.options as typeof Route.options & {
      shellComponent: ComponentType<{ children: ReactNode }>;
    };
    const shell = options.shellComponent;
    try {
      const html = renderToString(
        createElement(shell, {
          children: createElement('p', null, 'Fixture pending shell'),
        }),
      );
      expect(html).toContain('https://fixture.example/fixture-locale');
      expect(html).toContain('Fixture pending shell');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
