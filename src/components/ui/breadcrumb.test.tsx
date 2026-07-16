// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from './breadcrumb';

afterEach(cleanup);

describe('BreadcrumbPage', () => {
  it('announces the current page without exposing a fake disabled link', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Senior Backend Engineer</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const currentPage = screen.getByText('Senior Backend Engineer');

    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(currentPage).not.toHaveAttribute('role');
    expect(currentPage).not.toHaveAttribute('aria-disabled');
    expect(
      screen.queryByRole('link', { name: 'Senior Backend Engineer' }),
    ).toBeNull();
  });
});
