import { companyPath } from '@cavuno/board/paths';
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  MessagesSidebarController,
  ThreadController,
} from './-messages-runtime';
import { createConversationLoader } from './-messages.$conversationId';

import { Page, PageContent } from '@/components/layout/page';
import { MessagingLayout } from '@/components/messages/messaging-layout';
import { Button } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

type ThreadSearch = { view?: 'archived' };
type ThreadLoaderView = { view: 'inbox' | 'archived' };

export const Route = createFileRoute('/messages/$conversationId')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): ThreadSearch =>
    search.view === 'archived' ? { view: 'archived' } : {},
  loaderDeps: ({ search }): ThreadLoaderView => ({
    view: search.view ?? 'inbox',
  }),
  loader: createConversationLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.messagesPage_conversationTitle(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const listView = data.view === 'archived' ? 'archived' : 'inbox';
  const leaveThread = () =>
    void navigate({
      to: '/messages',
      search: listView === 'archived' ? { view: 'archived' } : {},
    });

  if (data.status === 'error') {
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
                initialInbox={data.inbox.conversations}
                selectedConversationId={data.conversationId}
              />
            }
            conversation={
              <div
                role="alert"
                className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"
              >
                <h1 className="text-lg font-semibold">
                  {m.messagesPage_threadErrorTitle()}
                </h1>
                <p className="text-muted-foreground max-w-md text-sm">
                  {m.messagesPage_threadErrorBody()}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void router.invalidate()}
                  >
                    {m.messagesPage_threadRetryLabel()}
                  </Button>
                  <Button type="button" variant="outline" onClick={leaveThread}>
                    {m.messagesPage_backToInboxLabel()}
                  </Button>
                </div>
              </div>
            }
            mobilePane="conversation"
          />
        </PageContent>
      </Page>
    );
  }

  const { conversation, messages, blockStatus, inbox } = data;
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
