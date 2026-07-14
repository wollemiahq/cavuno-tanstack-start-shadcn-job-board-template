/**
 * `/messages/$conversationId` — one conversation thread. The loader fetches the
 * header, the messages, and the block status in one gated read; the thread view
 * then polls for updates (ADR-0053 REST transport). A missing/forbidden thread
 * bounces back to the inbox (which itself redirects to sign-in when signed out).
 */
import {
  createFileRoute,
  isRedirect,
  redirect,
} from '@tanstack/react-router'

import { ThreadView } from '../components/messages/thread-view'
import { getThread } from '../server/messaging'

export const Route = createFileRoute('/messages/$conversationId')({
  loader: async ({ params }) => {
    try {
      return await getThread({ data: { id: params.conversationId } })
    } catch (error) {
      if (isRedirect(error)) throw error
      if (String(error).includes('EMAIL_UNVERIFIED')) {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: `/messages/${encodeURIComponent(params.conversationId)}` },
        })
      }
      throw redirect({ to: '/messages' })
    }
  },
  head: () => ({ meta: [{ title: 'Conversation' }] }),
  component: ThreadPage,
})

function ThreadPage() {
  const { conversation, messages, blockStatus } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-2xl">
      <ThreadView
        conversation={conversation}
        messages={messages}
        blockStatus={blockStatus}
      />
    </div>
  )
}
