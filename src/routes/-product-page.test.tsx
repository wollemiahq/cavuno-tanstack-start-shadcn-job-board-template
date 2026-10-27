// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProductPageView, type ProductPageDependencies } from './-product-page';

import { formatShare } from '@/board/product-view-model';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import type { Product } from '@cavuno/board';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/root-session', () => ({
  useRootSession: () => ({ ready: true, user: null }),
}));

afterEach(cleanup);

const dependencies: ProductPageDependencies = {
  startCheckout: vi.fn(),
  getCheckoutState: vi.fn(),
  resendLink: vi.fn(),
  loadReviews: vi.fn(),
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    object: 'product',
    slug: 'resume-pack',
    name: 'Resume pack',
    description: 'Plain description',
    summary: null,
    details: [],
    images: [],
    buttonLabel: null,
    price: { kind: 'fixed', currency: 'usd', amountCents: 1900 },
    soldOut: false,
    refundPolicy: null,
    questions: [],
    contents: [],
    facts: {
      fileCount: 1,
      linkCount: 0,
      fileTypes: ['pdf'],
      pageCount: 20,
      totalSizeBytes: 1,
    },
    isListed: true,
    ratingsEnabled: false,
    rating: null,
    url: '/products/resume-pack',
    descriptionHtml: null,
    salesCount: null,
    ...overrides,
  };
}

function renderPage(overrides: Partial<Product> = {}) {
  return render(
    <ProductPageView
      product={product(overrides)}
      seller={{ name: 'Example Board', logoUrl: null }}
      reviews={null}
      shareUrl="https://board.example/products/resume-pack"
      language="en"
      returnPath="/products/resume-pack"
      sessionId={null}
      dependencies={dependencies}
      onPurchase={vi.fn()}
    />,
  );
}

function rail() {
  return screen.getByRole('complementary', {
    name: m.product_purchaseRegionLabel(),
  });
}

/** The rail's facts table (phones get a second copy after the description). */
function facts() {
  return within(rail()).getByText((_, element) => element?.tagName === 'DL');
}

describe('ProductPageView', () => {
  it('renders the formatted description instead of the plain one', () => {
    const { container } = renderPage({
      descriptionHtml: '<h2>What is inside</h2><p>Six templates</p>',
    });

    const description = container.querySelector(
      '[data-slot="product-description"]',
    );
    expect(description?.querySelector('h2')).toHaveTextContent(
      'What is inside',
    );
    expect(screen.queryByText('Plain description')).not.toBeInTheDocument();
  });

  it('falls back to the plain description without formatted HTML', () => {
    renderPage({ descriptionHtml: null });

    expect(screen.getByText('Plain description')).toBeInTheDocument();
  });

  it('words a preset button key, and the default when none is set', () => {
    renderPage({ buttonLabel: 'i_want_this' });
    expect(
      screen.getByRole('button', { name: m.product_iWantThisAction() }),
    ).toBeInTheDocument();
    expect(screen.queryByText('i_want_this')).not.toBeInTheDocument();
    cleanup();

    renderPage({ buttonLabel: null });
    expect(
      screen.getByRole('button', { name: m.product_buyAction() }),
    ).toBeInTheDocument();
  });

  it('lets the seller’s own row replace a computed row with the same label', () => {
    renderPage({
      details: [
        {
          label: ` ${m.product_pagesLabel().toLocaleUpperCase()} `,
          value: '1 or 2 per template',
        },
      ],
    });

    const table = facts();
    expect(within(table).getByText('1 or 2 per template')).toBeInTheDocument();
    expect(within(table).queryByText('20')).not.toBeInTheDocument();
    // Rows the seller did not give are still computed.
    expect(within(table).getByText(m.product_filesLabel())).toBeInTheDocument();
  });

  it('reads in the phone’s visual order: buy card, description, then details', () => {
    const { container } = renderPage();

    const description = container.querySelector(
      '[data-slot="product-description"]',
    );
    const [railFacts, phoneFacts] = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="product-facts"]'),
    );
    const follows = (a: Node | null, b: Node | null | undefined) =>
      Boolean(
        a &&
        b &&
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
      );

    // The rail (buy card, then its desktop-only facts) comes before the
    // description, and the phone's facts copy after it.
    expect(rail()).toContainElement(railFacts ?? null);
    expect(follows(rail(), description)).toBe(true);
    expect(follows(description, phoneFacts)).toBe(true);
    expect(rail()).not.toContainElement(phoneFacts ?? null);
  });

  it('shows the sales count only when the seller shares it', () => {
    renderPage({ salesCount: 214 });
    expect(
      screen.getByText(m.product_salesCount({ count: 214 })),
    ).toBeInTheDocument();
    cleanup();

    const { container } = renderPage({ salesCount: null });
    expect(
      container.querySelector('[data-slot="product-sales-count"]'),
    ).toBeNull();
  });

  it('puts the rating distribution, 5 stars first, above the reviews', () => {
    renderPage({
      ratingsEnabled: true,
      rating: { average: 4.6, count: 7, histogram: [0, 0, 1, 1, 5] },
    });

    const distribution = screen.getByRole('list', {
      name: m.product_ratingDistributionLabel(),
    });
    const rows = within(distribution).getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('data-stars'))).toEqual([
      '5',
      '4',
      '3',
      '2',
      '1',
    ]);
    const locale = getLocale();
    // Percent signs sit after a no-break space in some languages.
    const share = (value: number) =>
      formatShare(locale, value).replace(/\s+/gu, ' ');
    expect(rows[0]).toHaveTextContent(m.product_starsAriaLabel({ stars: 5 }));
    // Whole percents that add up to 100: 72 + 14 + 14.
    expect(rows[0]).toHaveTextContent(share(0.72));
    expect(rows[1]).toHaveTextContent(share(0.14));
    expect(rows[4]).toHaveTextContent(share(0));
  });
});
