/**
 * The product page while a returning buyer's payment is confirmed: polling,
 * still waiting after a minute, or access removed. Only a buyer coming back
 * from Stripe sees it, so the product page loads it on demand.
 */
import { Clock, ShoppingBag } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { EmptyState } from '@/components/empty-state';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';

export function CheckoutReturnState({
  state,
  productName,
  onRetry,
}: {
  state: 'polling' | 'waiting' | 'removed';
  productName: string;
  onRetry: () => void;
}) {
  if (state === 'polling') {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={productName} />}>
          <Empty className="min-h-80 border-0" data-test="product-confirming">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.product_confirmingTitle()}</EmptyTitle>
              <EmptyDescription>{m.product_confirmingText()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }
  return (
    <Page width="content">
      <PageContent>
        <EmptyState
          icon={
            state === 'removed' ? (
              <ShoppingBag aria-hidden="true" />
            ) : (
              <Clock aria-hidden="true" />
            )
          }
          title={productName}
          description={
            state === 'removed'
              ? m.product_accessRemovedText()
              : m.product_paymentPendingText()
          }
          action={
            state === 'waiting' ? (
              <Button variant="outline" onClick={onRetry}>
                {m.appError_retryAction()}
              </Button>
            ) : undefined
          }
        />
      </PageContent>
    </Page>
  );
}
