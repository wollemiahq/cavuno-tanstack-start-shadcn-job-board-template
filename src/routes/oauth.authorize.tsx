/** The board MCP server's sign-in consent page; see `-oauth.authorize.tsx`. */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { decideMcpConsent } from '../server/mcp-consent';
import { loadMcpConsent, McpConsentView } from './-oauth.authorize';

import { headTitle } from '@/lib/page-title';

const assignLocation = (url: string) => window.location.assign(url);

export const Route = createFileRoute('/oauth/authorize')({
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
  return (
    <McpConsentView
      step={step}
      decide={decideMcpConsent}
      assignLocation={assignLocation}
    />
  );
}
