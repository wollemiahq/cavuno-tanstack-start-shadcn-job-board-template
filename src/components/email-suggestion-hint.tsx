import { useCallback, useRef, useState } from 'react';

import { m } from '../paraglide/messages';

import { FieldDescription } from '@/components/ui/field';
import { textActionClass } from '@/lib/text-link';

/**
 * A corrected address for a likely domain typo (`jane@gmial.com` →
 * `jane@gmail.com`), offered under an email field. `check` runs on blur,
 * `offer` shows the correction the API sent with a refused submit
 * (`email_domain_undeliverable`), and `clear` hides it once the person edits
 * the address or takes the correction.
 *
 * The checker (`@cavuno/board/email`, mostly a list of mail domains) is
 * imported on the first blur, so the job and sign-up pages that carry these
 * forms don't load it up front. Each call bumps `latest`, so a check that
 * resolves after the person edited or took a correction is dropped.
 */
export function useEmailSuggestion() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const latest = useRef(0);
  const show = useCallback((email: string | null) => {
    latest.current += 1;
    setSuggestion(email);
  }, []);
  const check = useCallback((email: string) => {
    const call = (latest.current += 1);
    void import('@cavuno/board/email').then(({ suggestEmailAddress }) => {
      if (call === latest.current) setSuggestion(suggestEmailAddress(email));
    });
  }, []);
  const offer = useCallback(
    (email: string | null | undefined) => show(email ?? null),
    [show],
  );
  const clear = useCallback(() => show(null), [show]);
  return { suggestion, check, offer, clear };
}

const EMAIL_SLOT = '\u0000';

/**
 * "Did you mean jane@gmail.com?", where one tap on the address takes it.
 * Pass `disabled` while the form is submitting: taking a correction then
 * would change the address under a request already sent.
 */
export function EmailSuggestionHint({
  suggestion,
  onAccept,
  disabled = false,
}: {
  suggestion: string | null;
  onAccept: (email: string) => void;
  disabled?: boolean;
}) {
  if (!suggestion) return null;
  // The sentence is one message so each language orders it its own way; the
  // address is the button inside it.
  const [before = '', after = ''] = m
    .product_emailSuggestionText({ email: EMAIL_SLOT })
    .split(EMAIL_SLOT);
  return (
    <FieldDescription role="status" data-test="email-suggestion">
      {before}
      <button
        type="button"
        className={textActionClass}
        data-test="email-suggestion-accept"
        disabled={disabled}
        onClick={() => onAccept(suggestion)}
      >
        {suggestion}
      </button>
      {after}
    </FieldDescription>
  );
}
