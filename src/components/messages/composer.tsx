'use client';

import { useState } from 'react';

import { Send } from 'lucide-react';

import { errorMessage } from '../../lib/message-error';
import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MAX_BODY = 8000;

/** Reply composer. Disabled (not hidden) with a reason hint when the viewer is
 * blocked or the cold-message rule is in effect — mirrors the hosted board. */
export function Composer({
  disabled,
  hint,
  onSend,
  onSent,
}: {
  disabled: boolean;
  hint: string | null;
  onSend: (body: string) => Promise<void>;
  onSent: () => void;
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
    try {
      await onSend(trimmed);
      setBody('');
      onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="border-border border-t p-3">
      <div className="relative">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={m.composer_placeholderText()}
          aria-label={m.composer_placeholderText()}
          rows={2}
          maxLength={MAX_BODY}
          className="min-h-20 resize-none pr-12"
          data-test="composer"
        />
        <Button
          type="button"
          size="icon-sm"
          className="absolute right-2 bottom-2"
          onClick={send}
          disabled={!body.trim() || sending}
          aria-label={m.composer_sendAriaLabel()}
          data-test="composer-send"
        >
          <Send aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="text-destructive mt-1 text-sm"
          data-test="composer-error"
        >
          {error}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-1 text-xs">
        {m.composer_hintText()}
      </p>
    </div>
  );
}
