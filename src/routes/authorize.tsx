/**
 * The board MCP server's sign-in consent page; see `-authorize.tsx`. The
 * marker makes it the site's `assistantConsent` page, which Cavuno sends an
 * assistant's sign-in to; without it Cavuno shows its own page.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { withoutAuthMarkers } from '../lib/mcp-authorize-query';
import { m } from '../paraglide/messages';
import { decideMcpConsent } from '../server/mcp-consent';
import { loadMcpConsent, McpConsentView } from './-authorize';

import { headTitle } from '@/lib/page-title';

export const cavunoPage = 'assistantConsent';

const rootApi = getRouteApi('__root__');

const assignLocation = (url: string) => window.location.assign(url);

export const Route = createFileRoute('/authorize')({
  loaderDeps: ({ search }) => ({ search: withoutAuthMarkers(search) }),
  loader: ({ location }) => loadMcpConsent(location.searchStr),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo?.boardName, m.mcpConsent_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: McpConsentPage,
});

function McpConsentPage() {
  const { step } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  return (
    <McpConsentView
      step={step}
      boardName={board.name}
      boardLogoUrl={board.logoUrl}
      decide={decideMcpConsent}
      assignLocation={assignLocation}
    />
  );
}
