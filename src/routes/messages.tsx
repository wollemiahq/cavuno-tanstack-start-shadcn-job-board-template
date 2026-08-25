import {
  createFileRoute,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';

import { m } from '../paraglide/messages';
import { createMessagesLoader } from './-messages';
import { MessagesSidebarController } from './-messages-runtime';

import type { MessagesView } from './-messages-controller';
import { Page, PageContent } from '@/components/layout/page';
import { MessagingLayout } from '@/components/messages/messaging-layout';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput, UrlSearchValue } from '@/lib/pagination';

function asView(value: UrlSearchValue): MessagesView {
  return value === 'archived' || value === 'blocked' ? value : 'inbox';
}

export const Route = createFileRoute('/messages')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): { view?: MessagesView } => {
    const view = asView(search.view);
    return view === 'inbox' ? {} : { view };
  },
  loaderDeps: ({ search }) => ({ view: asView(search.view) }),
  loader: createMessagesLoader(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.messagesPage_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: MessagesRoute,
});

export function hasSelectedConversationRoute(
  matches: ReadonlyArray<{ routeId: string }>,
): boolean {
  return matches.some((match) => match.routeId === '/messages/$conversationId');
}

function MessagesRoute() {
  const hasSelectedConversation = useRouterState({
    select: (state) => hasSelectedConversationRoute(state.matches),
  });

  return hasSelectedConversation ? <Outlet /> : <MessagesPage />;
}

function MessagesPage() {
  const data = Route.useLoaderData();
  const view = Route.useSearch().view ?? 'inbox';
  const list =
    data.view === 'blocked' ? (
      <MessagesSidebarController
        view="blocked"
        initialBlocked={data.blocked.data}
      />
    ) : (
      <MessagesSidebarController
        view={view}
        initialInbox={data.inbox.conversations}
      />
    );

  return (
    <Page width="wide">
      <PageContent>
        <MessagingLayout
          aria-label={m.messagesPage_title()}
          listLabel={m.messagesPage_conversationsAriaLabel()}
          conversationLabel={m.messagesPage_selectedConversationAriaLabel()}
          list={list}
          conversation={
            <Empty className="rounded-none border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {m.messagesPage_selectConversationTitle()}
                </EmptyTitle>
                <EmptyDescription>
                  {m.messagesPage_selectConversationDescription()}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
          mobilePane="list"
        />
      </PageContent>
    </Page>
  );
}
