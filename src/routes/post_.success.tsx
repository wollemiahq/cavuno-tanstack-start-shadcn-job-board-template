import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getJobPostingCheckout } from '../server/post';
import { getSeoBase } from '../server/queries';
import { PostCheckoutSuccessView } from './-post-checkout-outcome';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type PostSuccessSearch = { session_id?: string };

export const Route = createFileRoute('/post_/success')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): PostSuccessSearch => ({
    session_id: searchString(search.session_id),
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      // Neutral: the page says what the payment did only once it has read it.
      { title: headTitle(loaderData?.boardName, m.postJob_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PostCheckoutSuccessPage,
});

function PostCheckoutSuccessPage() {
  const { session_id: sessionId } = Route.useSearch();
  return (
    <PostCheckoutSuccessView
      sessionId={sessionId ?? null}
      readCheckout={getJobPostingCheckout}
    />
  );
}
