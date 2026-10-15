// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlaceDirectoryTree } from './place-directory-tree';

import { renderRouted } from '@/test/render-routed';

const place = (
  id: string,
  parentId: string | null,
  slug: string,
  canonicalSlug: string | null,
  displayName: string,
  candidateCount: number,
) => ({ id, parentId, slug, canonicalSlug, displayName, candidateCount });

afterEach(cleanup);

describe('PlaceDirectoryTree', () => {
  it('nests places busiest first and links each by its canonical slug', async () => {
    await renderRouted(
      <PlaceDirectoryTree
        places={[
          place('bsl', 'ch', 'basel', null, 'Basel', 2),
          place('zrh', 'ch', 'zurich', 'zuerich', 'Zürich', 6),
          place('ch', null, 'switzerland', 'schweiz', 'Schweiz', 8),
        ]}
        count={(entry) => entry.candidateCount}
        route="/talent/locations/$location"
      />,
    );

    const country = screen.getByRole('link', { name: 'Schweiz' });
    expect(country).toHaveAttribute('href', '/talent/locations/schweiz');
    const cities = within(country.closest('li') ?? document.body).getAllByRole(
      'link',
    );
    expect(cities.map((link) => link.getAttribute('href'))).toEqual([
      '/talent/locations/schweiz',
      '/talent/locations/zuerich',
      '/talent/locations/basel',
    ]);
    expect(country.parentElement).toHaveTextContent('8');
  });
});
