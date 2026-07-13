"use client";

import { useState } from "react";

import { Send01 } from "@untitledui/icons";

import { sendReply } from "../../server/messaging";
import { errorMessage } from "../../lib/message-error";
import { Button } from "@/components/base/buttons/button";
import { TextAreaBase } from "@/components/base/textarea/textarea";
import { m } from "../../paraglide/messages";

const MAX_BODY = 8000;

/** Reply composer. Disabled (not hidden) with a reason hint when the viewer is
 * blocked or the cold-message rule is in effect — mirrors the hosted board. */
export function Composer({
  conversationId,
  disabled,
  hint,
  onSent,
}: {
  conversationId: string;
  disabled: boolean;
  hint: string | null;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <div
        className="text-tertiary border-secondary border-t p-4 text-sm"
        data-test="composer-disabled"
      >
        {hint}
      </div>
    );
  }

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendReply({ data: { id: conversationId, body: { body: trimmed } } });
      setBody("");
      onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="border-t border-secondary p-3">
      <div className="relative">
        <TextAreaBase
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={m.composer_placeholderText()}
          rows={2}
          maxLength={MAX_BODY}
          className="min-h-[88px] pr-12"
          data-test="composer"
        />
        <Button
          color="primary"
          size="sm"
          iconLeading={Send01}
          className="absolute right-2 bottom-2"
          onClick={send}
          isDisabled={!body.trim() || sending}
          aria-label={m.composer_sendAriaLabel()}
          data-test="composer-send"
        />
      </div>
      {error ? (
        <p className="mt-1 text-sm text-error-primary" data-test="composer-error">
          {error}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-tertiary">{m.composer_hintText()}</p>
    </div>
  );
}
