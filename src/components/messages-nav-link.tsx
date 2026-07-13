"use client";

import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { getUnreadCount } from "../server/messaging";
import { useVisiblePoll } from "../lib/use-visible-poll";
import { Badge } from "@/components/base/badges/badges";
import { styles as buttonStyles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { m } from "../paraglide/messages";

/** Nav "Messages" link with a live unread badge, polled while the tab is
 * visible (ADR-0053 REST transport). Errors are swallowed so a walled or
 * signed-out state simply shows no badge. */
export function MessagesNavLink() {
  const [unread, setUnread] = useState(0);

  useVisiblePoll(() => {
    void getUnreadCount()
      .then((result) => setUnread(result.count))
      .catch(() => setUnread(0));
  }, 15000);

  return (
    <Link
      to="/messages"
      className={cx(
        buttonStyles.common.root,
        buttonStyles.sizes.sm.root,
        buttonStyles.colors.tertiary.root,
        "relative",
      )}
      data-test="nav-messages"
    >
      {m.messagesNavLink_label()}
      {unread > 0 ? (
        <Badge size="sm" color="error" type="pill-color" data-test="nav-unread">
          {unread}
        </Badge>
      ) : null}
    </Link>
  );
}
