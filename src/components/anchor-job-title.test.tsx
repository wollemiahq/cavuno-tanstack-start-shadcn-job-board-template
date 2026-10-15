// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { AnchorJobTitle } from './anchor-job-title';

const anchorJob = { id: 'job-1', slug: 'senior-chef', title: 'Senior chef' };

afterEach(cleanup);

describe('AnchorJobTitle', () => {
  it('links the anchor job when its page resolves', async () => {
    const rootRoute = createRootRoute();
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/',
          component: () => (
            <AnchorJobTitle
              anchorJob={anchorJob}
              path="/companies/acme/jobs/senior-chef"
            />
          ),
        }),
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('link', {
        name: m.jobAlertMatch_similarTo({ title: 'Senior chef' }),
      }),
    ).toHaveAttribute('href', '/companies/acme/jobs/senior-chef');
  });

  it('shows the title unlinked without a path, and “Similar jobs” without a job', () => {
    render(
      <>
        <AnchorJobTitle anchorJob={anchorJob} path={undefined} />
        <AnchorJobTitle anchorJob={null} path={undefined} />
      </>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByText(m.jobAlertMatch_similarTo({ title: 'Senior chef' }), {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(m.alertManager_similarJobsAlertLabel(), {
        exact: false,
      }),
    ).toBeInTheDocument();
  });
});
