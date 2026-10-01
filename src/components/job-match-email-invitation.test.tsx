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

import { JobMatchEmailInvitation } from './job-match-email-invitation';

import { m } from '@/paraglide/messages';
import type { NotificationPreference } from '@cavuno/board';

const preference: NotificationPreference = {
  object: 'notification_preference',
  channel: 'recommendedJobEmails',
  subscribed: false,
  waitlisted: false,
  updatedAt: null,
};

async function renderInvitation(saved: NotificationPreference | null) {
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <JobMatchEmailInvitation preference={saved} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe('job match email invitation', () => {
  it('links opted-out candidates to the existing preference in Settings', async () => {
    await renderInvitation(preference);

    expect(
      screen.getByRole('link', {
        name: m.accountRecommended_emailInvitationAction(),
      }),
    ).toHaveAttribute('href', '/settings#job-match-emails');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it.each([false, true])(
    'hides the invitation for subscribed candidates, including waitlisted=%s',
    async (waitlisted) => {
      await renderInvitation({ ...preference, subscribed: true, waitlisted });

      expect(
        screen.queryByRole('link', {
          name: m.accountRecommended_emailInvitationAction(),
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', {
          name: m.accountRecommended_emailInvitationTitle(),
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('hides the invitation when the preference is unknown', async () => {
    await renderInvitation(null);

    expect(
      screen.queryByRole('link', {
        name: m.accountRecommended_emailInvitationAction(),
      }),
    ).not.toBeInTheDocument();
  });
});
