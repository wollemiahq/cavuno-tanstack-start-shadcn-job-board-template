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

import {
  HelpArticlePage,
  HelpHomePage,
  type HelpCategoryGroup,
} from './help-center';

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
      icon: null,
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
    renderHome(
      <HelpHomePage
        boardName="Fixture"
        groups={groups}
        hasMoreArticles={false}
      />,
    );

    expect(
      await screen.findByRole('link', { name: 'Billing' }),
    ).toHaveAttribute('href', '/help/categories/billing');
    expect(
      screen.getByRole('link', { name: 'Where to find an invoice' }),
    ).toHaveAttribute('href', '/help/articles/invoices');
  });

  it("shows each category's icon, and a folder for none or a kind it does not know", async () => {
    const withIcon = (
      title: string,
      icon: HelpCategoryGroup['category']['icon'],
    ): HelpCategoryGroup => ({
      category: { ...groups[0]!.category, id: title, slug: title, title, icon },
      // The home leaves out a category with no article.
      articles: [refunds],
    });
    const { container } = renderHome(
      <HelpHomePage
        boardName="Fixture"
        groups={[
          withIcon('emoji', { type: 'emoji', value: '💳' }),
          withIcon('built-in', {
            type: 'icon',
            svg: '<svg viewBox="0 0 24 24"><path d="M22 10H2"/></svg>',
          }),
          withIcon('image', { type: 'image', url: 'https://cdn.test/i.webp' }),
          withIcon('none', null),
          // SAFETY: a kind a later API version adds, which this site's types
          // do not have yet.
          withIcon('unknown-kind', {
            type: 'video',
          } as never),
        ]}
        hasMoreArticles={false}
      />,
    );
    await screen.findByRole('heading', { name: 'emoji' });

    const marks = [
      ...container.querySelectorAll('[data-slot="help-category-icon"]'),
    ].map((tile) => {
      const mark = tile.firstElementChild!;
      if (mark.tagName === 'IMG') return mark.getAttribute('src');
      // The API's own drawing, put in the page as it is.
      if (mark.matches('[data-slot="help-category-icon-drawing"]')) {
        return mark.querySelector('path')?.getAttribute('d');
      }
      if (mark.tagName === 'SPAN') return mark.textContent;
      return [...mark.classList].find((name) => name.startsWith('lucide-'));
    });
    expect(marks).toEqual([
      '💳',
      'M22 10H2',
      'https://cdn.test/i.webp',
      'lucide-folder',
      'lucide-folder',
    ]);
  });

  it('shows the matching articles in place of the categories for a search', async () => {
    renderHome(
      <HelpHomePage
        boardName="Fixture"
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
        boardName="Fixture"
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

describe('HelpArticlePage', () => {
  it("lists the category's other articles after the body and links to the rest", async () => {
    renderHome(
      <HelpArticlePage
        article={{
          ...refunds,
          html: '<p>We refund within 48 hours.</p>',
          redirected: false,
          newSlug: null,
        }}
        moreInCategory={{
          articles: [article('invoices', 'Where to find an invoice')],
          hasMore: true,
        }}
        updatedLabel={null}
      />,
    );

    const more = await screen.findByRole('region', {
      name: m.helpArticle_moreInCategoryTitle({ category: 'Billing' }),
    });
    expect(
      within(more).getByRole('link', { name: 'Where to find an invoice' }),
    ).toHaveAttribute('href', '/help/articles/invoices');
    expect(
      within(more).getByRole('link', { name: m.help_viewAllLabel() }),
    ).toHaveAttribute('href', '/help/categories/billing');
  });

  it("lists related articles in place of the category's other articles", async () => {
    renderHome(
      <HelpArticlePage
        article={{
          ...refunds,
          html: '<p>We refund within 48 hours.</p>',
          redirected: false,
          newSlug: null,
        }}
        related={[article('payouts', 'When payouts arrive')]}
        moreInCategory={{
          articles: [article('invoices', 'Where to find an invoice')],
          hasMore: true,
        }}
        updatedLabel={null}
      />,
    );

    const related = await screen.findByRole('region', {
      name: m.helpArticle_relatedTitle(),
    });
    expect(
      within(related).getByRole('link', { name: 'When payouts arrive' }),
    ).toHaveAttribute('href', '/help/articles/payouts');
    expect(
      screen.queryByRole('link', { name: 'Where to find an invoice' }),
    ).toBeNull();
  });
});
