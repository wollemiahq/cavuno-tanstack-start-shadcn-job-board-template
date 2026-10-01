import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { OAuthCompletePage } from './-auth.oauth-complete';
import {
  loadOAuthComplete,
  validateOAuthCompleteSearch,
} from './-auth.oauth-complete-loader';

import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/auth/oauth-complete')({
  validateSearch: validateOAuthCompleteSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadOAuthComplete(deps),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authOauthComplete_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: OAuthCompletePage,
});
