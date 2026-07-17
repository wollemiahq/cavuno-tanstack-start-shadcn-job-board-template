import { isRateLimited } from '@cavuno/board';
import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * The router's default error boundary — the app-wide sibling of
 * `app-not-found`. Raw error text (stack traces, API phrases like
 * "Rate limit exceeded") never renders; the one detail worth reading is
 * whether it was rate limiting, which gets its own friendlier line.
 */
export function AppError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  // Server-function errors cross the wire as plain Errors, so the SDK's
  // type guard is backed up by a message sniff.
  const rateLimited =
    isRateLimited(error) || /rate limit/i.test(error?.message ?? '');

  return (
    <Empty className="mx-auto max-w-md py-24">
      <EmptyHeader>
        <EmptyTitle>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {m.appError_heading()}
          </h1>
        </EmptyTitle>
        <EmptyDescription>
          {rateLimited ? m.appError_rateLimitedBody() : m.appError_body()}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="lg"
            onClick={async () => {
              await router.invalidate();
              reset();
            }}
          >
            {m.appError_retryLabel()}
          </Button>
          <Link
            to="/"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {m.appError_homeLabel()}
          </Link>
        </div>
      </EmptyContent>
    </Empty>
  );
}
