import { useCallback, useRef, useState } from 'react';

import { m } from '../paraglide/messages';

import { FieldDescription, FieldError } from '@/components/ui/field';
import { textActionClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

/**
 * The state behind an email field's one message: a corrected address for a
 * likely domain typo (`jane@gmial.com` → `jane@gmail.com`), and the address
 * the API refused (`email_domain_undeliverable`), if any. `check` runs on
 * blur, `offer` shows a correction found before submitting, `refuse` records a refused submit with the correction the API sent,
 * and `clear` drops both once the person edits the address, takes the
 * correction or submits again.
 *
 * While a refusal shows, `check` does nothing: the blur that comes with
 * tapping the correction would otherwise replace the API's correction with
 * the local checker's (often none) and remove the button being tapped.
 *
 * The checker (`@cavuno/board/email`, mostly a list of mail domains) is
 * imported on the first blur, so the job and sign-up pages that carry these
 * forms don't load it up front. Each call bumps `latest`, so a check that
 * resolves after the person edited or took a correction is dropped.
 */
export function useEmailSuggestion() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [refusedEmail, setRefusedEmail] = useState<string | null>(null);
  const latest = useRef(0);
  const refused = useRef(false);
  const show = useCallback(
    (email: string | null, refusal: string | null = null) => {
      latest.current += 1;
      refused.current = refusal !== null;
      setSuggestion(email);
      setRefusedEmail(refusal);
    },
    [],
  );
  const check = useCallback((email: string) => {
    if (refused.current) return;
    const call = (latest.current += 1);
    void import('@cavuno/board/email').then(({ suggestEmailAddress }) => {
      if (call === latest.current) setSuggestion(suggestEmailAddress(email));
    });
  }, []);
  const refuse = useCallback(
    (email: string, correction: string | null | undefined) =>
      show(correction ?? null, email),
    [show],
  );
  /** Shows a correction found before submitting, with no refusal. */
  const offer = useCallback((email: string) => show(email), [show]);
  const clear = useCallback(() => show(null), [show]);
  return { suggestion, refusedEmail, check, offer, refuse, clear };
}

const EMAIL_SLOT = '\u0000';

/**
 * The one message under an email field, in one of three forms:
 * - after blur: "Did you mean jane@gmail.com?", muted;
 * - after the API refused the domain (`refusedEmail`), with a correction:
 *   "We can't send email to gmail.con. Did you mean jane@gmail.com?" as the
 *   field's error;
 * - refused with no correction: "We can't send email to this address.
 *   Check it for a typo."
 * The address is a button that takes the correction. Pass `disabled` while
 * the form is submitting: taking a correction then would change the address
 * under a request already sent.
 */
export function EmailSuggestionHint({
  suggestion,
  onAccept,
  refusedEmail = null,
  disabled = false,
}: {
  suggestion: string | null;
  onAccept: (email: string) => void;
  /** The address the API refused (`email_domain_undeliverable`), if any. */
  refusedEmail?: string | null;
  disabled?: boolean;
}) {
  const refused = refusedEmail !== null;
  if (refused && !suggestion) {
    return (
      <FieldError data-test="email-refused">
        {m.boardError_emailDomainUndeliverableText()}
      </FieldError>
    );
  }
  if (!suggestion) return null;
  // Each sentence is one message so each language orders it its own way;
  // the address is the button inside it.
  const [before = '', after = ''] = (
    refused
      ? m.boardError_emailDomainUndeliverableSuggestionText({
          domain: refusedEmail.slice(refusedEmail.lastIndexOf('@') + 1),
          email: EMAIL_SLOT,
        })
      : m.product_emailSuggestionText({ email: EMAIL_SLOT })
  ).split(EMAIL_SLOT);
  const accept = (
    <button
      type="button"
      className={refused ? refusedActionClass : textActionClass}
      data-test="email-suggestion-accept"
      disabled={disabled}
      onClick={() => onAccept(suggestion)}
    >
      {suggestion}
    </button>
  );
  return refused ? (
    <FieldError data-test="email-refused">
      {before}
      {accept}
      {after}
    </FieldError>
  ) : (
    <FieldDescription role="status" data-test="email-suggestion">
      {before}
      {accept}
      {after}
    </FieldDescription>
  );
}

/** The address inside the error line: the error's colour, always underlined. */
const refusedActionClass = cn(textActionClass, 'text-current underline');
