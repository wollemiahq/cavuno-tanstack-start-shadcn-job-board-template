import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase } from '../server/queries';
import { PostCheckoutCanceledView } from './-post-checkout-outcome';

import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/post/checkout-canceled')({
  staticData: { ownsMain: true },
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.boardName, m.postCheckout_canceledTitle()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PostCheckoutCanceledView,
});
