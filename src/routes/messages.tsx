import {
  createFileRoute,
  isRedirect,
  notFound,
  redirect,
} from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';

import { m } from '../paraglide/messages';
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
import { getBlocked, getInbox } from '@/server/messaging';
import { getBoardContext, getSeoBase } from '@/server/queries';

function asView(value: unknown): MessagesView {
  return value === 'archived' || value === 'blocked' ? value : 'inbox';
}

export const Route = createFileRoute('/messages')({
  staticData: { ownsMain: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: MessagesView } => {
    const view = asView(search.view);
    return view === 'inbox' ? {} : { view };
  },
  loaderDeps: ({ search }) => ({ view: asView(search.view) }),
  loader: async ({ deps }) => {
    // Messaging feature off ⇒ the surface does not exist on this board.
    const board = await getBoardContext();
    if (!board.features.messaging) throw notFound();
    const seo = await getSeoBase();
    try {
      if (deps.view === 'blocked') {
        return { view: 'blocked' as const, blocked: await getBlocked(), seo };
      }
      return {
        view: deps.view,
        inbox: await getInbox({ data: { archived: deps.view === 'archived' } }),
        seo,
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const returnTo =
        deps.view === 'inbox' ? '/messages' : `/messages?view=${deps.view}`;
      if (String(error).includes('EMAIL_UNVERIFIED')) {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo },
        });
      }
      throw redirect({ to: '/auth/sign-in', search: { returnTo } });
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.messagesPage_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: MessagesPage,
});

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
