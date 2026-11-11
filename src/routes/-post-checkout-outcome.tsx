import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { CircleCheck, CircleSlash, Clock } from 'lucide-react';

import {
  useJobCheckoutOutcome,
  type ReadJobCheckout,
} from '@/components/job-checkout-outcome';
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
import { Spinner } from '@/components/ui/spinner';
import { m } from '@/paraglide/messages';

/**
 * Where Stripe sends an anonymous `/post` buyer back to.
 *
 * The platform hardcodes these two paths — `/post/success` and
 * `/post/checkout-canceled` (`publicSubmission/submitJob.ts`) — so the board
 * owns both or the buyer's last screen after paying is a 404. The success
 * return carries `session_id`, and the page reads that checkout to say what
 * the payment did (a bank debit returns here while it is still clearing).
 * They are confirmations, not job views, and they point onward at a page that
 * always exists.
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
  action?: ReactNode;
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
          {action ? (
            <EmptyContent className="flex-row justify-center gap-2">
              {action}
            </EmptyContent>
          ) : null}
        </Empty>
      </main>
    </Page>
  );
}

export function PostCheckoutSuccessView({
  sessionId = null,
  readCheckout,
}: {
  /** From the return URL; without it (an older link) the page cannot check. */
  sessionId?: string | null;
  readCheckout: ReadJobCheckout;
}) {
  const outcome = useJobCheckoutOutcome(sessionId, readCheckout);
  if (sessionId && !outcome) {
    return (
      <PostCheckoutOutcome
        icon={<Spinner aria-hidden="true" />}
        title={m.employerLanding_confirmingText()}
        description={m.employerLanding_confirmingSubtitle()}
      />
    );
  }
  if (outcome?.kind === 'failed') {
    return (
      <PostCheckoutOutcome
        icon={<CircleSlash aria-hidden="true" />}
        title={outcome.title}
        description={outcome.body}
        action={
          <Link to="/post" className={buttonVariants()}>
            {m.postCheckout_backToPostLabel()}
          </Link>
        }
      />
    );
  }
  const waiting =
    outcome?.kind === 'processing' || outcome?.kind === 'unconfirmed';
  return (
    <PostCheckoutOutcome
      icon={
        waiting ? (
          <Clock aria-hidden="true" />
        ) : (
          <CircleCheck aria-hidden="true" />
        )
      }
      title={outcome?.title ?? m.postCheckout_successTitle()}
      description={outcome?.body ?? m.postCheckout_successBody()}
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
