import { companyPath } from '@cavuno/board/paths';
import {
  createFileRoute,
  isRedirect,
  redirect,
  useNavigate,
} from '@tanstack/react-router';

import {
  MessagesSidebarController,
  ThreadController,
} from './-messages-runtime';

import { Page, PageContent } from '@/components/layout/page';
import { MessagingLayout } from '@/components/messages/messaging-layout';
import { headTitle } from '@/lib/page-title';
import { m } from '@/paraglide/messages';
import { getInbox, getThread } from '@/server/messaging';
import { getSeoBase } from '@/server/queries';

type ThreadSearch = { view?: 'archived' };

export const Route = createFileRoute('/messages/$conversationId')({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): ThreadSearch =>
    search.view === 'archived' ? { view: 'archived' } : {},
  loaderDeps: ({ search }) => ({ view: search.view ?? 'inbox' }),
  loader: async ({ params, deps }) => {
    const returnTo = `/messages/${encodeURIComponent(params.conversationId)}${
      deps.view === 'archived' ? '?view=archived' : ''
    }`;
    try {
      const [thread, inbox] = await Promise.all([
        getThread({ data: { id: params.conversationId } }),
        getInbox({ data: { archived: deps.view === 'archived' } }),
      ]);
      return { ...thread, inbox, view: deps.view, seo: await getSeoBase() };
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (String(error).includes('EMAIL_UNVERIFIED')) {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo },
        });
      }
      throw redirect({
        to: '/messages',
        search: deps.view === 'archived' ? { view: 'archived' } : {},
      });
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.messagesPage_conversationTitle(),
        ),
      },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { conversation, messages, blockStatus, inbox, view } =
    Route.useLoaderData();
  const navigate = useNavigate();
  const listView = view === 'archived' ? 'archived' : 'inbox';
  const leaveThread = () =>
    void navigate({
      to: '/messages',
      search: listView === 'archived' ? { view: 'archived' } : {},
    });

  return (
    <Page width="wide">
      <PageContent>
        <MessagingLayout
          aria-label={m.messagesPage_title()}
          listLabel={m.messagesPage_conversationsAriaLabel()}
          conversationLabel={m.messagesPage_selectedConversationAriaLabel()}
          list={
            <MessagesSidebarController
              view={listView}
              initialInbox={inbox.conversations}
              selectedConversationId={conversation.id}
            />
          }
          conversation={
            <ThreadController
              key={conversation.id}
              initialConversation={conversation}
              initialMessages={messages}
              initialBlockStatus={blockStatus}
              companyHref={
                conversation.counterparty.companySlug
                  ? companyPath(conversation.counterparty.companySlug)
                  : undefined
              }
              onBack={leaveThread}
              onExit={leaveThread}
            />
          }
          mobilePane="conversation"
        />
      </PageContent>
    </Page>
  );
}
