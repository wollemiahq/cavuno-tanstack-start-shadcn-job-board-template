/**
 * `/me/purchases` — the signed-in user's purchased products: rows filed
 * under their account plus guest purchases made with their verified email.
 * Each row opens the purchase's download page.
 */
import { formatDate } from '@cavuno/board/format';
import { Link } from '@tanstack/react-router';
import { ShoppingBag } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { formatMoneyExact } from '@/board/product-view-model';
import { ProductCover } from '@/components/board/product-ui';
import { CandidateShell } from '@/components/candidate-shell';
import { EmptyState } from '@/components/empty-state';
import { buttonVariants } from '@/components/ui/button';
import type {
  PurchaseSummary,
  PurchaseSummaryListEnvelope,
} from '@cavuno/board';

function summaryLine(purchase: PurchaseSummary, locale: string): string {
  const date =
    formatDate(locale, purchase.purchasedAt) ??
    purchase.purchasedAt.slice(0, 10);
  if (!purchase.available) return m.mePurchases_unavailableLine({ date });
  return purchase.status === 'free'
    ? m.mePurchases_freeLine({ date })
    : m.mePurchases_paidLine({
        date,
        amount: formatMoneyExact(
          locale,
          purchase.amountCents,
          purchase.currency,
        ),
      });
}

export function PurchasesPageView({
  purchases,
}: {
  purchases: PurchaseSummaryListEnvelope;
}) {
  const locale = getLocale();
  const rows = purchases.data;
  if (rows.length === 0) {
    return (
      <CandidateShell>
        <EmptyState
          icon={<ShoppingBag aria-hidden="true" />}
          title={m.mePurchases_title()}
          description={m.mePurchases_emptyText()}
          action={
            <Link
              to="/products"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.mePurchases_browseAction()}
            </Link>
          }
        />
      </CandidateShell>
    );
  }
  return (
    <CandidateShell
      title={m.mePurchases_title()}
      description={m.mePurchases_subheading()}
    >
      <ul className="flex flex-col gap-3" data-test="purchases-list">
        {rows.map((purchase) => (
          <li
            key={purchase.id}
            className="border-border flex flex-wrap items-center gap-4 rounded-2xl border p-4"
          >
            <ProductCover src={purchase.product.coverImageUrl} size="thumb" />
            <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
              <span
                className={
                  purchase.available
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground font-semibold'
                }
                dir="auto"
              >
                {purchase.product.name}
              </span>
              <span className="text-muted-foreground text-sm">
                {summaryLine(purchase, locale)}
              </span>
            </div>
            {purchase.available ? (
              <Link
                to="/purchases/$purchaseToken"
                params={{ purchaseToken: purchase.purchaseToken }}
                className={buttonVariants()}
              >
                {m.mePurchases_openAction()}
                <span className="sr-only"> {purchase.product.name}</span>
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </CandidateShell>
  );
}
