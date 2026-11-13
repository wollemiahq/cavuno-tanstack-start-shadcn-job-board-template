import { renderToString } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { localizePath } from '../lib/localized-path';
import { MarkdownAlternateLink } from './markdown-alternate-link';

interface RouterStateFixture {
  location: { href: string };
  matches: Array<{ status: string }>;
}

const routerState = vi.hoisted((): RouterStateFixture => ({
  location: { href: '/' },
  matches: [],
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouterState: <T,>({
    select,
  }: {
    select: (state: RouterStateFixture) => T;
  }): T => select(routerState),
}));

function renderAt(canonicalHref: string, status = 'success') {
  routerState.location.href = canonicalHref;
  routerState.matches = [{ status: 'success' }, { status }];
  return renderToString(
    <MarkdownAlternateLink origin="https://board.example" />,
  );
}

describe('MarkdownAlternateLink', () => {
  it('links the localized twin of a page that has one', () => {
    const job = localizePath('/companies/acme/jobs/engineer');
    const html = renderAt('/companies/acme/jobs/engineer?ref=x');
    expect(html).toContain('rel="alternate"');
    expect(html).toContain('type="text/markdown"');
    expect(html).toContain(`href="https://board.example${job}.md"`);
    expect(renderAt('/')).toContain('href="https://board.example/index.md"');
  });

  it('links nothing on a page without a twin', () => {
    expect(renderAt('/pricing')).toBe('');
    expect(renderAt('/account')).toBe('');
  });

  it('links nothing when the page did not render', () => {
    expect(renderAt('/companies/missing', 'notFound')).toBe('');
    expect(renderAt('/blog/broken', 'error')).toBe('');
  });
});
