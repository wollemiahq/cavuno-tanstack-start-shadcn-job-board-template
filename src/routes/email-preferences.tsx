/**
 * /email-preferences?token=… — the page the board's email footers link to
 * (the `emailPreferences` route role). One page covers job alerts, job
 * matches, the board's marketing email and its topics, and Unsubscribe from
 * all. The token names the person, so there is no sign-in.
 *
 * The older `/alerts/manage` and `/settings` pages stay: emails already sent
 * link there with their own tokens.
 *
 * The link's `?token` never stays in the address bar: the loader keeps it
 * in an httpOnly cookie and redirects to `/email-preferences?person=…`, a
 * random key for that cookie, so analytics, referrers and screenshots don't capture it, a
 * reload still works, and each tab acts only for the person it shows.
 */
import { createFileRoute } from '@tanstack/react-router';

import { EmailPreferencesPageView } from './-email-preferences';
import {
  createEmailPreferencesLoader,
  emailPreferencesHead,
  type EmailPreferencesSearch,
} from './-email-preferences-loader';

import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/email-preferences')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): EmailPreferencesSearch => ({
    token: searchString(search.token),
    person: searchString(search.person),
  }),
  loaderDeps: ({ search }) => ({ token: search.token, person: search.person }),
  loader: createEmailPreferencesLoader(),
  // Changes are made on the page, so a cached load would show the
  // preferences from before them on Back.
  staleTime: 0,
  gcTime: 0,
  head: ({ loaderData }) => emailPreferencesHead(loaderData),
  component: EmailPreferencesPage,
});

function EmailPreferencesPage() {
  return <EmailPreferencesPageView data={Route.useLoaderData()} />;
}
