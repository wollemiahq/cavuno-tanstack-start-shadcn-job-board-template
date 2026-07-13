"use client";

import { useState } from "react";

import { DotsHorizontal } from "@untitledui/icons";

import type { Message } from "@cavuno/board";

import { editMessage, reportMessage, unsendMessage } from "../../server/messaging";
import { clockTime, withinEditWindow } from "../../lib/message-format";
import { errorMessage } from "../../lib/message-error";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Select } from "@/components/base/select/select";
import { TextAreaBase } from "@/components/base/textarea/textarea";
import { cx } from "@/utils/cx";
import { m } from "../../paraglide/messages";

type Reason = "spam" | "harassment" | "misrepresentation" | "other";

const REASONS: { value: Reason; label: () => string }[] = [
  { value: "spam", label: m.messageBubble_reasonSpam },
  { value: "harassment", label: m.messageBubble_reasonHarassment },
  {
    value: "misrepresentation",
    label: m.messageBubble_reasonMisrepresentation,
  },
  { value: "other", label: m.messageBubble_reasonOther },
];

/** One message + its inline actions (edit/unsend for the author within 15 min;
 * report for the recipient, which auto-blocks the author → parent navigates). */
export function MessageBubble({
  message,
  own,
  showSeen,
  onChanged,
  onReported,
}: {
  message: Message;
  own: boolean;
  showSeen: boolean;
  onChanged: () => void;
  onReported: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "report">("view");
  const [draft, setDraft] = useState(message.body);
  const [reason, setReason] = useState<Reason>("spam");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleted = message.deletedAt !== null;
  const canEdit = own && !deleted && withinEditWindow(message.sentAt);
  const canReport = !own && !deleted;

  const run = async (fn: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = () =>
    run(
      () => editMessage({ data: { id: message.id, body: { body: draft.trim() } } }),
      () => {
        setMode("view");
        onChanged();
      },
    );

  const unsend = () =>
    run(
      () => unsendMessage({ data: { id: message.id } }),
      () => onChanged(),
    );

  const submitReport = () =>
    run(
      () => reportMessage({ data: { id: message.id, body: { reason } } }),
      () => onReported(),
    );

  return (
    <div
      className={cx("flex flex-col", own ? "items-end" : "items-start")}
      data-message-id={message.id}
      data-own={own}
      data-deleted={deleted}
    >
      <div className="group flex max-w-[80%] items-start gap-1">
        {mode === "edit" ? (
          <div className="w-72 space-y-2">
            <TextAreaBase
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={8000}
              data-test="edit-textarea"
            />
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                onClick={saveEdit}
                isDisabled={busy || !draft.trim()}
              >
                {m.messageBubble_saveLabel()}
              </Button>
              <Button
                color="tertiary"
                size="sm"
                onClick={() => {
                  setMode("view");
                  setDraft(message.body);
                }}
              >
                {m.messageBubble_cancelLabel()}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cx(
              "rounded-2xl px-3 py-2 text-sm",
              deleted
                ? "text-tertiary italic opacity-70"
                : own
                  ? "bg-brand-solid text-white"
                  : "bg-secondary",
            )}
          >
            {deleted ? m.messageBubble_messageDeletedText() : message.body}
          </div>
        )}

        {(canEdit || canReport) && mode === "view" ? (
          <Dropdown.Root>
            <ButtonUtility
              size="xs"
              color="tertiary"
              icon={DotsHorizontal}
              aria-label={m.messageBubble_messageActionsAriaLabel()}
              className="opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              data-test="message-actions"
            />
            <Dropdown.Popover placement={own ? "bottom end" : "bottom start"}>
              <Dropdown.Menu>
                {canEdit ? (
                  <Dropdown.Item
                    label={m.messageBubble_editLabel()}
                    onAction={() => setMode("edit")}
                  />
                ) : null}
                {canEdit ? (
                  <Dropdown.Item
                    label={m.messageBubble_unsendLabel()}
                    onAction={() => void unsend()}
                  />
                ) : null}
                {canReport ? (
                  <Dropdown.Item
                    label={m.messageBubble_reportLabel()}
                    onAction={() => setMode("report")}
                  />
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        ) : null}
      </div>

      {mode === "report" ? (
        <div className="mt-1 w-64 space-y-2 rounded-lg border border-secondary p-2">
          <p className="text-sm font-medium">{m.messageBubble_reportTitle()}</p>
          <Select
            size="sm"
            selectedKey={reason}
            onSelectionChange={(key) => setReason(key as Reason)}
            items={REASONS.map((r) => ({ id: r.value, label: r.label() }))}
            data-test="report-reason"
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
          <p className="text-xs text-tertiary">{m.messageBubble_reportBlocksText()}</p>
          <div className="flex gap-2">
            <Button color="primary" size="sm" onClick={submitReport} isDisabled={busy}>
              {m.messageBubble_submitReportLabel()}
            </Button>
            <Button color="tertiary" size="sm" onClick={() => setMode("view")}>
              {m.messageBubble_cancelLabel()}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="text-tertiary mt-0.5 flex items-center gap-1 text-xs">
        <time dateTime={message.sentAt}>{clockTime(message.sentAt)}</time>
        {message.editedAt && !deleted ? <span>{m.messageBubble_editedText()}</span> : null}
        {showSeen && message.readAt ? (
          <span data-test="seen">
            {m.messageBubble_seenText({ time: clockTime(message.readAt) })}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-error-primary text-xs">{error}</p> : null}
    </div>
  );
}
