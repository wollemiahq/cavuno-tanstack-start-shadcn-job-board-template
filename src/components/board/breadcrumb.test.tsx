// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ShellBreadcrumb } from './breadcrumb';

afterEach(cleanup);

describe('ShellBreadcrumb', () => {
  it('renders the supplied trail as breadcrumb navigation', () => {
    render(
      <ShellBreadcrumb
        ariaLabel="Breadcrumbs"
        items={[{ name: 'Home', href: '/' }, { name: 'Jobs' }]}
      />,
    );

    const navigation = screen.getByRole('navigation', {
      name: 'Breadcrumbs',
    });
    expect(navigation).toContainElement(
      screen.getByRole('link', { name: 'Home' }),
    );
    expect(screen.getByText('Jobs')).toHaveAttribute('aria-current', 'page');
  });
});
