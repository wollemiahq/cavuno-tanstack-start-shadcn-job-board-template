// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { boardCopy } from '#/copy';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JobList } from './job-list';

afterEach(cleanup);

describe('JobList empty collection', () => {
  it('keeps the empty result heading and recovery guidance in an owned Empty', () => {
    const copy = boardCopy('en');
    const { container } = render(<JobList jobs={[]} language="en" />);

    expect(container.querySelector('[data-slot="empty"]')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: copy.jobSearch.headingJobs }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(copy.jobSearch.noJobsMatchText),
    ).toBeInTheDocument();
  });
});
