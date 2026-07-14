---
name: Messaging
purpose: A responsive inbox that supports focused full-page conversations and lightweight desktop replies without losing the current page.
primitives: [MessagingLayout, MessagingDock, Message, Bubble, Marker, MessageScroller, Attachment, Avatar, Textarea, Button]
usedBy: [src/routes/messages.tsx, src/routes/messages.$conversationId.tsx, src/routes/-messages-dock-controller.tsx]
---

## Purpose

Messaging gives signed-in candidates and employers one consistent conversation
model in two contexts: a dedicated inbox for sustained work and a floating
desktop dock for quick replies while browsing the board. Both contexts share the
same thread, composer, permissions, polling, and read-receipt behavior.

## When to use

- Use the dedicated route when a person intentionally opens Messages or needs to
  manage inbox, archived, and blocked views.
- Use the floating dock for lightweight replies while another board page remains
  visible.
- **When NOT to use** — application notes, support chat, or anonymous contact
  forms. Those are different domains and must not reuse the board-user messaging
  transport.

## Anatomy

- `MessagingLayout` — one rounded, bordered box. The conversation rail is fixed
  at 22rem and the selected thread fills the remaining width.
- Conversation rail — title, search, inbox/archive/blocked tabs, and compact rows
  with identity, snippet, timestamp, selected state, and unread state.
- `ThreadView` — counterparty identity and role, actions, the message stream, and
  composer. It has no data access; route-private controllers own Board API calls.
- `MessageScroller` — opens at the latest message and follows new messages only
  while the reader remains at the live edge. Scrolling upward is respected.
- `Message`, `Bubble`, and `Marker` — author identity, wrapping message content,
  timestamps/read receipts, day separators, and the unread boundary.
- `MessagingDock` — a narrow inbox fixed to the desktop bottom-right. A selected
  conversation opens as its own wider box immediately to the left.
- Recoverable load failure — replaces the relevant skeleton with an honest
  message and Retry action while preserving any still-valid sibling surface.
- `Attachment` — an owned shadcn primitive available for API-backed attachments.
  Version 1.34.0 of `@cavuno/board` has no messaging upload contract, so the live
  composer deliberately exposes no attachment control.

## Composition

The dedicated route composes the same rail and thread inside one box:

```tsx
<MessagingLayout
  aria-label={m.messagesPage_title()}
  list={<MessagesSidebarController view={view} initialInbox={inbox} />}
  conversation={
    <ThreadController
      initialConversation={conversation}
      initialMessages={messages}
      initialBlockStatus={blockStatus}
      onExit={leaveThread}
    />
  }
  mobilePane="conversation"
/>
```

The global controller uses `MessagingDock` with the same sidebar and thread
controllers. The dock never compresses both panes into one small window: the
inbox owns the right edge and the conversation is a sibling box to its left.
Below `md`, the dock is absent and `/messages` uses route-based list → thread
navigation.

## Do / Don't

| Do | Don't |
|---|---|
| Keep the dedicated inbox inside one two-column bordered box. | Render the list and thread as unrelated cards or full-width sections. |
| Open a dock conversation as a separate sibling window to the inbox. | Squeeze the inbox and thread into one narrow floating panel. |
| Preserve the reader’s scroll position and auto-follow only at the live edge. | Force-scroll to the bottom whenever polling returns a message. |
| Replace a failed inbox or thread load with a Retry state. | Leave an indefinite skeleton after the request has failed. |
| Keep drafts after failed sends and announce the error. | Clear a draft before the server confirms the message. |
| Keep Board API calls, polling, and mutations in route-private controllers. | Fetch from `src/components/**` or call the Board API in the browser directly. |
| Show identity, role, day boundaries, unread boundary, and read receipts. | Rely on bubble color alone to communicate authorship or state. |
| Add attachment controls only with a real upload/send contract. | Ship decorative upload controls that cannot complete an attachment flow. |

## Used by

- `src/routes/messages.tsx` — dedicated inbox and unselected state.
- `src/routes/messages.$conversationId.tsx` — dedicated selected thread and
  mobile thread route.
- `src/routes/-messages-dock-controller.tsx` — global desktop inbox and adjacent
  conversation window.

## Related

- [Pending / loading](pending-loading.md)
- [Empty state](empty-state.md)
- [Site header](site-header.md)
- [Form feedback](form-feedback.md)
