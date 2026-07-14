// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TaxonomyTags } from './taxonomy-tags';

afterEach(cleanup);

describe('TaxonomyTags — owned shadcn SEO spine', () => {
  it('renders crawlable shadcn Badge anchors and a non-link overflow badge', () => {
    const { container } = render(
      <TaxonomyTags
        chips={[
          { key: 'react', name: 'React', href: '/jobs/skills/react' },
          {
            key: 'design',
            name: 'Product design',
            href: '/jobs/skills/product-design',
          },
        ]}
        overflow={4}
      />,
    );

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/jobs/skills/react',
      '/jobs/skills/product-design',
    ]);
    expect(
      links.every((link) => link.getAttribute('data-slot') === 'badge'),
    ).toBe(true);

    const badges = container.querySelectorAll("[data-slot='badge']");
    expect(badges).toHaveLength(3);
    expect(screen.getByText('+4').tagName).toBe('SPAN');
    expect(screen.queryByRole('link', { name: '+4' })).not.toBeInTheDocument();
  });
});
