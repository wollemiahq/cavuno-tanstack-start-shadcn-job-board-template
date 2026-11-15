import { notFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { buildLegalTwin, type LegalTwinDependencies } from './legal';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/terms-of-service';

const dependencies = {
  getLegalPageView: vi.fn(),
} satisfies LegalTwinDependencies;

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({
    method: 'GET',
    url: `${ORIGIN}${localizePath(path)}.md`,
  });
  if (!twin) throw new Error(`no twin for ${path}`);
  return twin;
}

function view(page: {
  title: string;
  html: string;
  legalEntity?: { legalName: string | null; address: string | null };
}) {
  return {
    seo: { origin: ORIGIN },
    head: { links: [{ rel: 'canonical', href: CANONICAL }] },
    page: { legalEntity: null, ...page },
  };
}

beforeEach(() => {
  dependencies.getLegalPageView.mockReset();
});

describe('legal twins', () => {
  it('converts the page body to Markdown under its title', async () => {
    dependencies.getLegalPageView.mockResolvedValue(
      view({
        title: 'Terms of *service*',
        html: '<h2>Use</h2><p>Be <strong>kind</strong>.</p>',
      }),
    );
    const result = await buildLegalTwin(
      'terms-of-service',
      twinFor('/terms-of-service'),
      dependencies,
    );

    expect(dependencies.getLegalPageView).toHaveBeenCalledWith({
      data: { type: 'terms-of-service' },
    });
    expect(result).toEqual({
      type: 'markdown',
      body: '# Terms of \\*service\\*\n\n## Use\n\nBe **kind**.\n',
      canonical: CANONICAL,
    });
  });

  it('shows the impressum legal entity before the body', async () => {
    dependencies.getLegalPageView.mockResolvedValue(
      view({
        title: 'Impressum',
        html: '<p>Body</p>',
        legalEntity: { legalName: 'Acme GmbH', address: 'Street 1\nBerlin' },
      }),
    );
    const result = await buildLegalTwin(
      'impressum',
      twinFor('/impressum'),
      dependencies,
    );
    expect(result).toMatchObject({
      body: '# Impressum\n\nAcme GmbH\n\nStreet 1  \nBerlin\n\nBody\n',
    });
  });

  it('404s a page that has no content, as the page does', async () => {
    dependencies.getLegalPageView.mockRejectedValue(notFound());
    await expect(
      buildLegalTwin('impressum', twinFor('/impressum'), dependencies),
    ).resolves.toEqual({ type: 'notFound' });
  });
});
