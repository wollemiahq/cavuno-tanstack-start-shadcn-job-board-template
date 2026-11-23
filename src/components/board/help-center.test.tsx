// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HelpHomePage, type HelpCategoryGroup } from './help-center';

import { m } from '@/paraglide/messages';
import type { PublicHelpArticleSummary } from '@cavuno/board';

const billing = { id: 'cat-billing', slug: 'billing', title: 'Billing' };

function article(slug: string, title: string): PublicHelpArticleSummary {
  return {
    id: slug,
    object: 'public_help_article',
    slug,
    title,
    summary: null,
    category: billing,
    publishedAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };
}

const refunds = article('refunds', 'How refunds work');

const groups: HelpCategoryGroup[] = [
  {
    category: {
      ...billing,
      object: 'public_help_category',
      description: 'Invoices, refunds and receipts.',
    },
    articles: [refunds, article('invoices', 'Where to find an invoice')],
  },
];

afterEach(cleanup);

function renderHome(element: React.ReactNode) {
  const rootRoute = createRootRoute();
  const route = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => element,
      }),
      route('/help'),
      route('/help/categories/$helpCategorySlug'),
      route('/help/articles/$helpArticleSlug'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('HelpHomePage', () => {
  it('lists each category with links to its articles when nothing is searched', async () => {
    renderHome(<HelpHomePage groups={groups} hasMoreArticles={false} />);

    expect(
      await screen.findByRole('link', { name: 'Billing' }),
    ).toHaveAttribute('href', '/help/categories/billing');
    expect(
      screen.getByRole('link', { name: 'Where to find an invoice' }),
    ).toHaveAttribute('href', '/help/articles/invoices');
  });

  it('shows the matching articles in place of the categories for a search', async () => {
    renderHome(
      <HelpHomePage
        groups={[]}
        hasMoreArticles={false}
        search={{ query: 'refund', results: [refunds] }}
      />,
    );

    const results = await screen.findByRole('region', {
      name: m.help_searchResultsHeading({
        count: 1,
        countLabel: '1',
        query: 'refund',
      }),
    });
    const links = within(results).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/help/articles/refunds');
    expect(links[0]).toHaveTextContent('How refunds work');
  });

  it('says a search matched nothing and links back to every article', async () => {
    renderHome(
      <HelpHomePage
        groups={[]}
        hasMoreArticles={false}
        search={{ query: 'visa', results: [] }}
      />,
    );

    const results = await screen.findByRole('region', {
      name: m.help_searchEmptyTitle({ query: 'visa' }),
    });
    expect(
      within(results).getByRole('link', { name: m.help_searchResetLabel() }),
    ).toHaveAttribute('href', '/help');
  });
});
