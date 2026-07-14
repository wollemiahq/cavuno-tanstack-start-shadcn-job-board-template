// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsResultsBar } from './jobs-results-bar';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

describe('JobsResultsBar — replaceable shadcn select seam', () => {
  const source = readFileSync(
    join(import.meta.dirname, 'jobs-results-bar.tsx'),
    'utf8',
  );

  it('uses the owned shadcn Select API rather than the legacy select system', () => {
    expect(source).toMatch(/from ['"]@\/components\/ui\/select['"]/);
    expect(source).not.toMatch(/components\/base\/select/);
  });

  it('promotes the contextual count to the single results heading', () => {
    render(
      <JobsResultsBar
        count={12}
        page={1}
        pageSize={20}
        heading="Engineering jobs"
        language="en"
        sort="relevance"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '12 Engineering jobs',
    );
  });
});
