'use client';

import { useState } from 'react';

import { Send } from 'lucide-react';

import { errorMessage } from '../../lib/message-error';
import { m } from '../../paraglide/messages';

import { Field, FieldError } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';

const MAX_BODY = 8000;

/** Reply composer. Disabled (not hidden) with a reason hint when the viewer is
 * blocked or the cold-message rule is in effect — mirrors the hosted board. */
export function Composer<TResult = void>({
  disabled,
  hint,
  onSend,
  onSent,
}: {
  disabled: boolean;
  hint: string | null;
  onSend: (body: string) => Promise<TResult>;
  onSent: (result: TResult) => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <div
        className="border-border text-muted-foreground border-t p-4 text-sm"
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
    let result: TResult;
    try {
      result = await onSend(trimmed);
    } catch (err) {
      setError(errorMessage(err));
      setSending(false);
      return;
    }
    // The message is committed. Keep route reconciliation outside the send
    // catch so a navigation failure can never invite a duplicate send.
    setBody('');
    setSending(false);
    onSent(result);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="border-border border-t p-3">
      <Field className="gap-1" data-invalid={Boolean(error)}>
        <InputGroup className="h-auto">
          <InputGroupTextarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={m.composer_placeholderText()}
            aria-label={m.composer_placeholderText()}
            aria-invalid={Boolean(error)}
            rows={2}
            maxLength={MAX_BODY}
            className="max-h-40 min-h-20 overflow-y-auto"
            data-test="composer"
          />
          <InputGroupAddon align="block-end" className="justify-between">
            <InputGroupText>{m.composer_hintText()}</InputGroupText>
            <InputGroupButton
              type="button"
              variant="default"
              size="icon-sm"
              onClick={send}
              disabled={!body.trim() || sending}
              aria-label={m.composer_sendAriaLabel()}
              data-test="composer-send"
            >
              <Send aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error ? (
          <FieldError data-test="composer-error">{error}</FieldError>
        ) : null}
      </Field>
    </div>
  );
}
