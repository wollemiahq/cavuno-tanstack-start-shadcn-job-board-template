// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JobList } from './job-list';

afterEach(cleanup);

describe('JobList empty collection', () => {
  it('keeps the empty result heading and recovery guidance in an owned Empty', () => {
    const { container } = render(<JobList jobs={[]} language="en" />);

    expect(container.querySelector('[data-slot="empty"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
    expect(
      screen.getByText('No jobs match — try clearing a filter.'),
    ).toBeInTheDocument();
  });
});
