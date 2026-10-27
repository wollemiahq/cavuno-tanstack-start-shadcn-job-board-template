// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductPageView, type ProductPageDependencies } from './-product-page';

import { formatRating, formatShare } from '@/board/product-view-model';
import { productPriceText } from '@/components/board/product-ui';
import { HeaderRouteActionsProvider } from '@/components/header-route-actions';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import type { Product, PurchaseSummary } from '@cavuno/board';

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

type TestSession = { user: { id: string; email: string } | null };
const session = vi.hoisted((): TestSession => ({
  user: null,
}));

vi.mock('@/components/root-session', () => ({
  useRootSession: () => ({ ready: true, user: session.user }),
}));

afterEach(() => {
  cleanup();
  session.user = null;
  vi.mocked(dependencies.loadMyPurchases).mockReset();
});

const dependencies: ProductPageDependencies = {
  startCheckout: vi.fn(),
  getCheckoutState: vi.fn(),
  resendLink: vi.fn(),
  loadReviews: vi.fn(),
  loadMyPurchases: vi.fn(),
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

function page(
  overrides: Partial<Product> = {},
  headerSlot: HTMLElement | null = null,
  {
    onFilledChange = () => {},
    sessionId = null,
  }: {
    onFilledChange?: (filled: boolean) => void;
    sessionId?: string | null;
  } = {},
) {
  return (
    <HeaderRouteActionsProvider value={{ target: headerSlot, onFilledChange }}>
      <ProductPageView
        product={product(overrides)}
        seller={{ name: 'Example Board', logoUrl: null }}
        reviews={null}
        shareUrl="https://board.example/products/resume-pack"
        language="en"
        returnPath="/products/resume-pack"
        sessionId={sessionId}
        dependencies={dependencies}
        onPurchase={vi.fn()}
      />
    </HeaderRouteActionsProvider>
  );
}

function renderPage(...args: Parameters<typeof page>) {
  return render(page(...args));
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
          kind: 'text',
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

describe('ProductPageView — yes/no detail rows', () => {
  it('shows a check row as a tick or a cross named Yes or No, text rows as text', () => {
    renderPage({
      details: [
        { kind: 'text', label: 'Formats', value: 'Google Docs, Word, PDF' },
        { kind: 'check', label: 'ATS-tested', checked: true },
        { kind: 'check', label: 'Printed copy', checked: false },
      ],
    });

    const table = facts();
    const value = (label: string) =>
      within(table).getByText(label).nextElementSibling;
    expect(value('Formats')).toHaveTextContent('Google Docs, Word, PDF');
    expect(value('ATS-tested')).toHaveTextContent(m.product_detailYes());
    expect(value('ATS-tested')).toHaveAttribute('data-checked', 'true');
    expect(value('Printed copy')).toHaveTextContent(m.product_detailNo());
    expect(value('Printed copy')).toHaveAttribute('data-checked', 'false');
    // The word is for assistive tech; sighted readers get the icon.
    expect(within(table).getByText(m.product_detailYes())).toHaveClass(
      'sr-only',
    );
  });
});

function purchase(overrides: Partial<PurchaseSummary> = {}): PurchaseSummary {
  return {
    id: 'purchase-1',
    object: 'purchase_summary',
    product: { slug: 'resume-pack', name: 'Resume pack', coverImageUrl: null },
    status: 'paid',
    purchasedAt: '2026-10-20T10:00:00.000Z',
    amountCents: 1900,
    currency: 'usd',
    available: true,
    purchaseToken: 'tok_owner',
    downloadUrl: '/purchases/tok_owner',
    ...overrides,
  };
}

const otherProduct = { slug: 'other', name: 'Other', coverImageUrl: null };

function library(data: PurchaseSummary[]) {
  return {
    object: 'list' as const,
    url: '/me/purchases',
    hasMore: false,
    nextCursor: null,
    data,
  };
}

// Prices carry no-break spaces in some languages: compare them as written.
const exactText = {
  normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }),
};

function headerSlot() {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  return slot;
}

describe('ProductPageView — already bought', () => {
  const buyer = { id: 'user-1', email: 'ada@example.com' };

  it('gives the owner their download page, Copy link and Buy again', async () => {
    session.user = buyer;
    vi.mocked(dependencies.loadMyPurchases).mockResolvedValue(
      library([purchase({ product: otherProduct }), purchase()]),
    );
    renderPage();

    const card = within(rail());
    expect(
      await card.findByText(m.product_youBoughtThisText()),
    ).toBeInTheDocument();
    expect(
      card.getByRole('link', { name: m.product_openDownloadPageAction() }),
    ).toBeInTheDocument();
    expect(
      card.getByRole('button', { name: m.product_buyAgainAction() }),
    ).toBeInTheDocument();
    expect(
      card.queryByRole('button', { name: m.product_buyAction() }),
    ).toBeNull();
  });

  it('drops the bought state as soon as the buyer signs out', async () => {
    session.user = buyer;
    vi.mocked(dependencies.loadMyPurchases).mockResolvedValue(
      library([purchase()]),
    );
    const view = renderPage();
    await screen.findByText(m.product_youBoughtThisText());

    session.user = null;
    view.rerender(page());
    expect(screen.queryByText(m.product_youBoughtThisText())).toBeNull();
    expect(
      within(rail()).getByRole('button', { name: m.product_buyAction() }),
    ).toBeInTheDocument();
  });

  it('keeps the buy card for a signed-in visitor who has not bought it', async () => {
    session.user = buyer;
    vi.mocked(dependencies.loadMyPurchases).mockResolvedValue(
      library([purchase({ product: otherProduct })]),
    );
    renderPage();

    await waitFor(() =>
      expect(dependencies.loadMyPurchases).toHaveBeenCalledTimes(1),
    );
    expect(
      within(rail()).getByRole('button', { name: m.product_buyAction() }),
    ).toBeInTheDocument();
    expect(screen.queryByText(m.product_youBoughtThisText())).toBeNull();
  });

  it('never asks for purchases for a guest', () => {
    renderPage();

    expect(dependencies.loadMyPurchases).not.toHaveBeenCalled();
    expect(
      within(rail()).getByRole('button', { name: m.product_buyAction() }),
    ).toBeInTheDocument();
  });

  it('falls back to the buy card when the library cannot be read', async () => {
    session.user = buyer;
    vi.mocked(dependencies.loadMyPurchases).mockRejectedValue(
      new Error('unavailable'),
    );
    renderPage();

    await waitFor(() =>
      expect(dependencies.loadMyPurchases).toHaveBeenCalledTimes(1),
    );
    expect(
      within(rail()).getByRole('button', { name: m.product_buyAction() }),
    ).toBeInTheDocument();
    expect(screen.queryByText(m.product_youBoughtThisText())).toBeNull();
  });
});

describe('ProductPageView — desktop header actions', () => {
  beforeEach(() => {
    // jsdom has no layout: opening the buying step scrolls the price card.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  it('fills the header with the stars, the price and the buy button', async () => {
    const slot = headerSlot();
    renderPage(
      {
        buttonLabel: 'i_want_this',
        ratingsEnabled: true,
        rating: { average: 4.6, count: 7, histogram: [0, 0, 1, 1, 5] },
      },
      slot,
    );

    const header = within(slot);
    expect(
      header.getByText(productPriceText(product().price), exactText),
    ).toBeInTheDocument();
    expect(
      header.getByRole('link', {
        name: m.product_ratingLong({
          rating: formatRating(getLocale(), 4.6),
          count: 7,
        }),
      }),
    ).toHaveAttribute('href', '#reviews');

    fireEvent.click(
      header.getByRole('button', { name: m.product_iWantThisAction() }),
    );
    // The header button opens the price card's own buying step.
    await waitFor(() =>
      expect(
        within(rail()).queryByRole('button', {
          name: m.product_iWantThisAction(),
        }),
      ).toBeNull(),
    );
  });

  it('tells the header while it fills the slot, and not while paying', () => {
    const slot = headerSlot();
    const onFilledChange = vi.fn();
    const view = renderPage({}, slot, { onFilledChange });
    expect(onFilledChange).toHaveBeenLastCalledWith(true);

    // Back from Stripe: the confirming state leaves the header its links.
    view.rerender(page({}, slot, { onFilledChange, sessionId: 'cs_1' }));
    expect(onFilledChange).toHaveBeenLastCalledWith(false);
    expect(slot).toBeEmptyDOMElement();
  });

  it('leaves the stars out when nothing is rated', () => {
    const slot = headerSlot();
    renderPage({ ratingsEnabled: false }, slot);

    expect(within(slot).queryByRole('link')).toBeNull();
    expect(
      within(slot).getByRole('button', { name: m.product_buyAction() }),
    ).toBeEnabled();
  });

  it('shows the price and a disabled Sold out button for a sold-out product', () => {
    const slot = headerSlot();
    renderPage({ soldOut: true }, slot);

    expect(
      within(slot).getByText(productPriceText(product().price), exactText),
    ).toBeInTheDocument();
    expect(
      within(slot).getByRole('button', { name: m.product_soldOutLabel() }),
    ).toBeDisabled();
  });

  it('opens the download page for the owner, even when sold out', async () => {
    session.user = { id: 'user-1', email: 'ada@example.com' };
    vi.mocked(dependencies.loadMyPurchases).mockResolvedValue(
      library([purchase()]),
    );
    const slot = headerSlot();
    renderPage({ soldOut: true }, slot);

    expect(
      await within(slot).findByRole('link', {
        name: m.product_openDownloadPageAction(),
      }),
    ).toBeInTheDocument();
    expect(within(slot).queryByRole('button')).toBeNull();
  });
});
