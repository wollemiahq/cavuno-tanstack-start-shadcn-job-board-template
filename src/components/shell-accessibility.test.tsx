// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MainContentTarget, SkipToContentLink } from './shell-accessibility';

afterEach(cleanup);

describe('shell accessibility', () => {
  it('starts with a skip link that targets one focusable route-content container', () => {
    render(
      <>
        <SkipToContentLink label="Skip to main content" />
        <a href="/jobs">Jobs</a>
        <MainContentTarget>
          <main>Route content</main>
        </MainContentTarget>
      </>,
    );

    const links = screen.getAllByRole('link');
    const target = document.getElementById('main-content');

    expect(links[0]).toHaveAccessibleName('Skip to main content');
    expect(links[0]).toHaveAttribute('href', '#main-content');
    expect(document.querySelectorAll('#main-content')).toHaveLength(1);
    expect(target).toHaveAttribute('tabindex', '-1');
    links[0]?.focus();
    expect(document.activeElement).toBe(links[0]);
  });
});
