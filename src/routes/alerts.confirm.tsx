/**
 * /alerts/confirm?token=… — the double-opt-in landing the confirmation email
 * links to (the board's canonical domain, which this starter serves). Confirms
 * server-side in the loader and renders the outcome by status.
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, confirmJobAlert } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { headTitle } from '@/lib/page-title';

type ConfirmStatus =
  | 'confirmed'
  | 'already_confirmed'
  | 'expired'
  | 'not_found';

const COPY: Record<
  ConfirmStatus,
  { heading: () => string; body: () => string }
> = {
  confirmed: {
    heading: m.alertsConfirm_confirmedHeading,
    body: m.alertsConfirm_confirmedBody,
  },
  already_confirmed: {
    heading: m.alertsConfirm_alreadyConfirmedHeading,
    body: m.alertsConfirm_alreadyConfirmedBody,
  },
  expired: {
    heading: m.alertsConfirm_expiredHeading,
    body: m.alertsConfirm_expiredBody,
  },
  not_found: {
    heading: m.alertsConfirm_notFoundHeading,
    body: m.alertsConfirm_notFoundBody,
  },
};

export const Route = createFileRoute('/alerts/confirm')({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps,
  }): Promise<{
    status: ConfirmStatus;
    seo: Awaited<ReturnType<typeof getSeoBase>>;
  }> => {
    // Started before the token branch so it overlaps the confirm call.
    const seoPromise = getSeoBase();
    if (!deps.token) return { status: 'not_found', seo: await seoPromise };
    // A malformed/garbage token must render the not-found state, not 500 —
    // this page is reached from email links, where mangled tokens happen.
    try {
      const [result, seo] = await Promise.all([
        confirmJobAlert({ data: { token: deps.token } }),
        seoPromise,
      ]);
      return { status: result.status, seo };
    } catch {
      return { status: 'not_found', seo: await seoPromise };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.alertsConfirm_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { status } = Route.useLoaderData();
  const copy = COPY[status];
  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-3 py-8 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {copy.heading()}
          </h1>
          <p className="text-muted-foreground">{copy.body()}</p>
        </div>
      </PageContent>
    </Page>
  );
}
