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

import { m } from '../../paraglide/messages';
import { MembershipPostGate } from './membership-post-gate';

afterEach(cleanup);

const becomeMember = { name: m.postGate_becomeMemberLabel() };
const signIn = { name: m.postGate_signInLabel() };
const postAsCompany = { name: m.postGate_postAsCompanyLabel() };
// The email-free wording of the contact invite, for asserting its absence.
const contactInvite = m
  .postGate_contactText({ email: '\u0000' })
  .split('\u0000')
  .reduce((longest, part) => (part.length > longest.length ? part : longest))
  .trim();

type GateProps = React.ComponentProps<typeof MembershipPostGate>;

/** The gate renders typed `Link`s, so it mounts under a real router. */
async function renderGate(props: GateProps) {
  const rootRoute = createRootRoute();
  const children = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <MembershipPostGate {...props} />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/memberships',
      component: () => <h1>Memberships</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/sign-in',
      component: () => <h1>Sign in</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/employers',
      component: () => <h1>Employers</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/employers/dashboard',
      component: () => <h1>Dashboard</h1>,
    }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const result = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Example Jobs' });
  return result;
}

describe('MembershipPostGate', () => {
  it('offers a signed-out visitor both roads, returning to the gated surface', async () => {
    await renderGate({ boardName: 'Example Jobs', hasMembershipPage: true });

    expect(screen.getByRole('link', becomeMember)).toHaveAttribute(
      'href',
      '/memberships',
    );
    expect(screen.getByRole('link', signIn)).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fpost',
    );
  });

  it('makes sign in the only road when the board publishes no membership plan', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(screen.queryByRole('link', becomeMember)).toBeNull();
    expect(screen.getByRole('link', signIn)).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fpost',
    );
  });

  it('sends a signed-in viewer to their company dashboard, keeping the membership road', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      signedIn: true,
      hasMembershipPage: true,
    });

    expect(screen.getByRole('link', postAsCompany)).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(screen.getByRole('link', becomeMember)).toBeVisible();
    expect(screen.queryByRole('link', signIn)).toBeNull();
  });

  it('hides the company-workspace road when the visitor is already there', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      signedIn: true,
      hasMembershipPage: true,
      showCompanyWorkspaceLink: false,
    });

    expect(screen.queryByRole('link', postAsCompany)).toBeNull();
    expect(screen.getByRole('link', becomeMember)).toBeVisible();
  });

  it('hides become-a-member for a signed-in viewer when /memberships would 404', async () => {
    await renderGate({ boardName: 'Example Jobs', signedIn: true });

    expect(screen.getByRole('link', postAsCompany)).toHaveAttribute(
      'href',
      '/employers/dashboard',
    );
    expect(screen.queryByRole('link', becomeMember)).toBeNull();
    expect(screen.queryByRole('link', signIn)).toBeNull();
  });

  it('invites the visitor to email for access when the board publishes an address', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      contactEmail: 'members@example.com',
    });

    expect(
      screen.getByText(
        m.postGate_contactText({ email: 'members@example.com' }),
      ),
    ).toBeVisible();
  });

  it('says nothing about email when the board publishes no address', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(
      screen.queryByText((content) => content.includes(contactInvite)),
    ).toBeNull();
  });
});
