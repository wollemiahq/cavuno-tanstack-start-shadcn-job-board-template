// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PaginationLink } from './pagination';

afterEach(cleanup);

describe('PaginationLink', () => {
  it('is a native link and forwards new-tab anchor attributes', () => {
    render(
      <PaginationLink
        href="/jobs?page=2"
        target="_blank"
        rel="noreferrer"
        isActive
      >
        Page 2
      </PaginationLink>,
    );

    const link = screen.getByRole('link', { name: 'Page 2' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/jobs?page=2');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Page 2' })).toBeNull();
  });
});
