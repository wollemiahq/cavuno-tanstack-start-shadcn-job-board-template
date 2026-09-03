// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SaveJobButton } from './save-job-button';

afterEach(cleanup);

function renderSave(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = [
    '/auth/sign-in',
    '/auth/verify-email',
    '/auth/verify-email-required',
    '/saved-jobs',
  ].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('SaveJobButton candidate continuation', () => {
  it('keeps the complete job destination through candidate sign-in', async () => {
    const returnTo =
      '/jobs?q=design&location=Sydney&selectedJob=product-designer';
    renderSave(
      <SaveJobButton
        jobId="job-1"
        viewer={null}
        returnTo={returnTo}
        labels={{
          save: 'Save',
          saving: 'Saving…',
          saved: 'Saved',
          error: 'Could not save.',
        }}
        onSave={vi.fn(async () => {})}
      />,
    );

    const save = await screen.findByRole('link', { name: 'Save' });
    const href = save.getAttribute('href');
    expect(href).not.toBeNull();
    const signInUrl = new URL(href!, 'https://board.example');
    expect(signInUrl.pathname).toBe('/auth/sign-in');
    expect(signInUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('keeps the complete job destination through email verification', async () => {
    const returnTo = '/companies/acme/jobs/product-designer#apply';
    renderSave(
      <SaveJobButton
        jobId="job-1"
        viewer={{ emailVerified: false }}
        returnTo={returnTo}
        labels={{
          save: 'Save',
          saving: 'Saving…',
          saved: 'Saved',
          error: 'Could not save.',
        }}
        onSave={vi.fn(async () => {})}
      />,
    );

    const href = (
      await screen.findByRole('link', { name: 'Save' })
    ).getAttribute('href');
    expect(href).not.toBeNull();
    const verifyUrl = new URL(href!, 'https://board.example');
    expect(verifyUrl.pathname).toBe('/auth/verify-email-required');
    expect(verifyUrl.searchParams.get('returnTo')).toBe(returnTo);
  });

  it('opens the canonical saved-jobs collection after saving', async () => {
    renderSave(
      <SaveJobButton
        jobId="job-1"
        viewer={{ emailVerified: true }}
        returnTo="/companies/acme/jobs/product-designer"
        labels={{
          save: 'Save',
          saving: 'Saving…',
          saved: 'Saved',
          error: 'Could not save.',
        }}
        onSave={vi.fn(async () => {})}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Saved' })).toHaveAttribute(
        'href',
        '/saved-jobs',
      );
    });
  });

  it('offers the same save flow as a compact icon control for search cards', async () => {
    const onSave = vi.fn(async () => {});
    renderSave(
      <SaveJobButton
        jobId="job-1"
        viewer={{ emailVerified: true }}
        returnTo="/jobs?selectedJob=product-designer"
        presentation="icon"
        labels={{
          save: 'Save job',
          saving: 'Saving job…',
          saved: 'Job saved',
          error: 'Could not save.',
        }}
        onSave={onSave}
      />,
    );

    const save = await screen.findByRole('button', { name: 'Save job' });
    fireEvent.click(save);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Job saved' })).toHaveAttribute(
        'href',
        '/saved-jobs',
      );
    });
    expect(onSave).toHaveBeenCalledWith('job-1');
  });

  it('surfaces a recoverable save failure and permits retry', async () => {
    const onSave = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce();
    renderSave(
      <SaveJobButton
        jobId="job-1"
        viewer={{ emailVerified: true }}
        returnTo="/companies/acme/jobs/product-designer"
        labels={{
          save: 'Save',
          saving: 'Saving…',
          saved: 'Saved',
          error: 'Could not save.',
        }}
        onSave={onSave}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Saved' })).toBeVisible(),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
