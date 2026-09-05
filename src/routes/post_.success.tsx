import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase } from '../server/queries';
import { PostCheckoutSuccessView } from './-post-checkout-outcome';

import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/post_/success')({
  staticData: { ownsMain: true },
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.boardName, m.postCheckout_successTitle()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PostCheckoutSuccessView,
});
