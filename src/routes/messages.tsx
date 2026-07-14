/**
 * `/messages` — the inbox. Three tabs (Inbox / Archived / Blocked) are driven
 * by the `?view=` search param. The loader's server function enforces auth;
 * the redirect here is UX, not the security boundary. Individual threads live
 * at `/messages/$conversationId`.
 */
import { Text } from "@/components/text"
import { createFileRoute, isRedirect, Link, redirect } from "@tanstack/react-router";

import { BlockedList } from "../components/messages/blocked-list";
import { InboxList } from "../components/messages/inbox-list";
import { m } from "../paraglide/messages";
import { getBlocked, getInbox } from "../server/messaging";
import { cx } from "@/utils/cx";

type View = "inbox" | "archived" | "blocked";

function asView(value: unknown): View {
  return value === "archived" || value === "blocked" ? value : "inbox";
}

const TABS: { view: View; label: () => string }[] = [
  { view: "inbox", label: m.messagesPage_inboxTabLabel },
  { view: "archived", label: m.messagesPage_archivedTabLabel },
  { view: "blocked", label: m.messagesPage_blockedTabLabel },
];

export const Route = createFileRoute("/messages")({
  // `view` is optional so a plain `to="/messages"` (nav link, redirects) needs
  // no search; the default inbox view omits it entirely.
  validateSearch: (search: Record<string, unknown>): { view?: View } => {
    const view = asView(search.view);
    return view === "inbox" ? {} : { view };
  },
  loaderDeps: ({ search }) => ({ view: asView(search.view) }),
  loader: async ({ deps }) => {
    try {
      if (deps.view === "blocked") {
        return { view: "blocked" as const, blocked: await getBlocked() };
      }
      const archived = deps.view === "archived";
      return {
        view: deps.view as View,
        inbox: await getInbox({ data: { archived } }),
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (String(error).includes("EMAIL_UNVERIFIED")) {
        throw redirect({
          to: "/auth/verify-email-required",
          search: {
            returnTo:
              deps.view === "inbox" ? "/messages" : `/messages?view=${deps.view}`,
          },
        });
      }
      throw redirect({
        to: "/auth/sign-in",
        search: {
          returnTo:
            deps.view === "inbox" ? "/messages" : `/messages?view=${deps.view}`,
        },
      });
    }
  },
  head: () => ({ meta: [{ title: m.messagesPage_title() }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const data = Route.useLoaderData();
  const view = Route.useSearch().view ?? "inbox";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Text as="h1" variant="heading1">{m.messagesPage_title()}</Text>

      <nav className="border-secondary flex gap-1 border-b text-sm" data-test="message-tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.view}
            to="/messages"
            search={{ view: tab.view }}
            className={cx(
              "border-b-2 px-3 py-2 -mb-px",
              view === tab.view
                ? "border-foreground text-primary font-medium"
                : "text-tertiary hover:text-primary border-transparent",
            )}
          >
            {tab.label()}
          </Link>
        ))}
      </nav>

      {data.view === "blocked" && data.blocked ? (
        <BlockedList initial={data.blocked.data} />
      ) : data.inbox ? (
        // key by view so Inbox↔Archived remounts with the fresh loader data
        // (its row/cursor state is seeded once, on mount).
        <InboxList
          key={data.view}
          initial={data.inbox.conversations}
          archived={data.view === "archived"}
        />
      ) : null}
    </div>
  );
}
