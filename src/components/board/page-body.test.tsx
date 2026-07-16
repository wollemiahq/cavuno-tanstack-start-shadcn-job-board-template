// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageBody } from './page-body';

/**
 * `PageBody` is the page-width primitive: it owns the constrained container
 * and, when given a `rail`, becomes the canonical two-column layout. The
 * structural guarantees below are what let every page share one width.
 */
describe('PageBody', () => {
  it('renders a full-bleed band above the constrained content', () => {
    const { container } = render(
      <PageBody band={<div data-test="band">band</div>}>
        <p>content</p>
      </PageBody>,
    );
    expect(container.querySelector('[data-test="band"]')).not.toBeNull();
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('switches to the two-column grid with an aside when a rail is given', () => {
    const { container } = render(
      <PageBody
        rail={<div data-test="rail">rail</div>}
        railLabel="Supplementary content"
      >
        <p>main</p>
      </PageBody>,
    );
    // The rail lives in an <aside>; both columns render.
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside!.querySelector('[data-test="rail"]')).not.toBeNull();
    expect(aside).toHaveAccessibleName('Supplementary content');
    expect(screen.getByText('main')).toBeTruthy();
  });

  it('renders a single content column (no aside) without a rail', () => {
    const { container } = render(
      <PageBody>
        <p>only</p>
      </PageBody>,
    );
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.getByText('only')).toBeTruthy();
  });

  it('uses the canonical Page family instead of owning a second max-width system', () => {
    const { container } = render(
      <PageBody>
        <p>only</p>
      </PageBody>,
    );

    expect(container.querySelector('[data-layout="page"]')).not.toBeNull();
    expect(
      container.querySelector('[data-layout="page-content"]'),
    ).not.toBeNull();
    expect(container.querySelector('.max-w-7xl')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
  });
});
