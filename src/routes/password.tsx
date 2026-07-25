import { useState } from 'react';

import { safeRedirectPath } from '@cavuno/board/server';
import { createFileRoute, useRouter } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import { m } from '../paraglide/messages';
import { verifyBoardPassword } from '../server/board-access';
import { getSeoBase } from '../server/queries';

import { Button } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

/**
 * The board-password challenge. A gated content read on a protected board
 * redirects here (server-side) with a validated `?redirect=` back-target. On
 * success the host sets the grant cookie and we re-run the loaders (the grant
 * now rides every gated read) and navigate back. Parity with the hosted board's
 * /password page.
 */
export const Route = createFileRoute('/password')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [{ title: headTitle(loaderData?.boardName, m.passwordPage_title()) }],
  }),
  component: PasswordPage,
});

function PasswordPage() {
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AuthCard title={m.passwordPage_cardTitle()}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await verifyBoardPassword({
              data: { password: String(form.get('password')) },
            });
            if (result.ok) {
              await router.invalidate();
              await router.navigate({ href: safeRedirectPath(redirect) });
            } else {
              setError(m.passwordPage_incorrectPasswordError());
            }
          } catch {
            // Transport failure (network drop, 5xx) — distinct from a wrong
            // password, and the form must come back usable.
            setError(m.passwordPage_genericError());
          } finally {
            setPending(false);
          }
        }}
      >
        <Field
          label={m.passwordPage_passwordLabel()}
          name="password"
          type="password"
          autoComplete="off"
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? m.passwordPage_checkingLabel()
            : m.passwordPage_continueLabel()}
        </Button>
      </form>
    </AuthCard>
  );
}
