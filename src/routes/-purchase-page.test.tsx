// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PurchaseReadyView,
  type PurchasePageDependencies,
} from './-purchase-page';

import { m } from '@/paraglide/messages';
import type { Purchase } from '@cavuno/board';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function file(fileId: string, displayName: string) {
  return {
    kind: 'file' as const,
    fileId,
    displayName,
    description: null,
    contentType: 'application/pdf',
    sizeBytes: 300_000_000,
    pageCount: null,
    state: 'ready' as const,
    downloadsUsed: 0,
    downloadsLeft: 5,
    stamped: false,
  };
}

function purchase(downloadAllAvailable: boolean): Purchase {
  return {
    object: 'purchase',
    status: 'free',
    product: { slug: 'guide', name: 'Salary guide', thankYouMessage: null },
    email: 'buyer@example.com',
    purchasedAt: '2026-10-26T00:00:00.000Z',
    amountCents: 0,
    currency: 'usd',
    downloadCap: 5,
    files: [file('file_1', 'Video'), file('file_2', 'Workbook')],
    downloadAllAvailable,
    stamping: 'off',
    receiptUrl: null,
    refundPolicy: null,
    ratingsEnabled: false,
    review: null,
    purchaseToken: 'token',
    confirmationToken: null,
  };
}

function dependencies(
  overrides: Partial<PurchasePageDependencies> = {},
): PurchasePageDependencies {
  return {
    confirmEmail: vi.fn(),
    download: vi.fn(),
    downloadAll: vi.fn(),
    review: vi.fn(),
    resend: vi.fn(),
    openUrl: vi.fn(),
    invalidate: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('purchase page: Download all', () => {
  it('offers Download all when the page says it is available', () => {
    render(
      <PurchaseReadyView
        purchase={purchase(true)}
        purchaseToken="token"
        dependencies={dependencies()}
      />,
    );
    expect(
      screen.getByRole('button', { name: m.purchase_downloadAllAction() }),
    ).toBeInTheDocument();
  });

  it('hides Download all when the files are too large to zip together', () => {
    render(
      <PurchaseReadyView
        purchase={purchase(false)}
        purchaseToken="token"
        dependencies={dependencies()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: m.purchase_downloadAllAction() }),
    ).not.toBeInTheDocument();
    // Each file keeps its own download.
    expect(screen.getAllByRole('button')).not.toHaveLength(0);
  });

  it('a stale tab refused Download all shows an inline message and re-reads the page', async () => {
    const deps = dependencies({
      downloadAll: vi.fn(async () => ({
        ok: false as const,
        code: 'purchase_download_all_unavailable',
        message:
          'These files are too large to download together; download them one by one',
      })),
    });
    render(
      <PurchaseReadyView
        purchase={purchase(true)}
        purchaseToken="token"
        dependencies={deps}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.purchase_downloadAllAction() }),
    );
    expect(
      await screen.findByText(m.boardError_purchaseDownloadAllText()),
    ).toBeInTheDocument();
    await waitFor(() => expect(deps.invalidate).toHaveBeenCalledTimes(1));
    expect(deps.openUrl).not.toHaveBeenCalled();
  });
});
