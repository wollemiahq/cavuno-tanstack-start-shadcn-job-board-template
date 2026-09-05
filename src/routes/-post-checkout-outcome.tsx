import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { CircleCheck, CircleSlash } from 'lucide-react';

import { Page } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { m } from '@/paraglide/messages';

/**
 * Where Stripe sends an anonymous `/post` buyer back to.
 *
 * The platform hardcodes these two paths — `/post/success` and
 * `/post/checkout-canceled` (`publicSubmission/submitJob.ts`) — so the board
 * owns both or the buyer's last screen after paying is a 404. Neither page
 * can look the job up: the wizard is anonymous, so the `job` id in the return
 * URL belongs to no session this frontend can read. They are confirmations,
 * not job views, and they point onward at a page that always exists.
 */
function PostCheckoutOutcome({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Page width="content">
      <main className="flex-1">
        <Empty className="min-h-[calc(100dvh-12rem)] border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            {action}
          </EmptyContent>
        </Empty>
      </main>
    </Page>
  );
}

export function PostCheckoutSuccessView() {
  return (
    <PostCheckoutOutcome
      icon={<CircleCheck aria-hidden="true" />}
      title={m.postCheckout_successTitle()}
      description={m.postCheckout_successBody()}
      action={
        <Link to="/jobs" className={buttonVariants()}>
          {m.postCheckout_browseJobsLabel()}
        </Link>
      }
    />
  );
}

export function PostCheckoutCanceledView() {
  return (
    <PostCheckoutOutcome
      icon={<CircleSlash aria-hidden="true" />}
      title={m.postCheckout_canceledTitle()}
      description={m.postCheckout_canceledBody()}
      action={
        <Link to="/post" className={buttonVariants()}>
          {m.postCheckout_backToPostLabel()}
        </Link>
      }
    />
  );
}
