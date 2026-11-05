/**
 * `/tip` — the board's tip jar. A board without one (or with an archived
 * one) answers `tip_jar_not_found`, so the page is a 404 and the footer link
 * is hidden. Stripe returns the tipper here with `session_id`.
 */
import {
  createFileRoute,
  getRouteApi,
  useLocation,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getTipCheckoutState,
  getTipPage,
  startTipCheckout,
} from '../server/tip-jar';
import { TipPageView, type TipPageDependencies } from './-tip-page';

import { PageLayout } from '@/components/layout/page-layout';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const cavunoPage = 'tip';

type TipSearch = {
  /** Stripe's return: the Checkout Session to confirm. */
  session_id?: string;
};

const dependencies: TipPageDependencies = {
  startCheckout: startTipCheckout,
  getCheckoutState: getTipCheckoutState,
};

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/tip')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: UrlSearchInput): TipSearch => ({
    session_id: searchString(search.session_id),
  }),
  loaderDeps: ({ search }) => ({ returning: Boolean(search.session_id) }),
  loader: ({ deps }) => getTipPage({ data: deps }),
  head: ({ loaderData }) => loaderData?.head ?? {},
  component: TipPage,
  notFoundComponent: () => (
    <PageLayout>
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center">
        {m.notFound_pageNotFound()}
      </p>
    </PageLayout>
  ),
});

function TipPage() {
  const { tipJar } = Route.useLoaderData();
  const { session_id: sessionId } = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <TipPageView
      tipJar={tipJar}
      boardName={board.name}
      returnPath={pathname}
      sessionId={sessionId ?? null}
      dependencies={dependencies}
    />
  );
}
