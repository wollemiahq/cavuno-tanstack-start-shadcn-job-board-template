/**
 * Head for `/purchases/$purchaseToken`, kept apart from the page UI so the
 * route file can import it without pulling the page into the shared shell.
 * Download pages are private: never indexed, never a referrer.
 */
import { m } from '../paraglide/messages';

import { headTitle } from '@/lib/page-title';

export function purchaseHead(loaderData: { boardName: string } | undefined) {
  return {
    meta: [
      { title: headTitle(loaderData?.boardName, m.purchase_metaTitle()) },
      { name: 'robots', content: 'noindex' },
      // The URL carries the buyer's token: send no referrer anywhere.
      { name: 'referrer', content: 'no-referrer' },
    ],
  };
}
