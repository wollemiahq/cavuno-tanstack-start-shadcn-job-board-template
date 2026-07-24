// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from './page-layout';

describe('PageLayout', () => {
  it('renders a full-bleed band above the constrained content', () => {
    const { container } = render(
      <PageLayout band={<div data-test="band">band</div>}>
        <p>content</p>
      </PageLayout>,
    );
    expect(container.querySelector('[data-test="band"]')).not.toBeNull();
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('switches to the two-column grid with an aside when a rail is given', () => {
    const { container } = render(
      <PageLayout
        rail={<div data-test="rail">rail</div>}
        railLabel="Supplementary content"
      >
        <p>main</p>
      </PageLayout>,
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
      <PageLayout>
        <p>only</p>
      </PageLayout>,
    );
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.getByText('only')).toBeTruthy();
  });
});
