import { useCallback, useState } from 'react';

import { suggestEmailAddress } from '@cavuno/board/email';

import { m } from '../paraglide/messages';

import { FieldDescription } from '@/components/ui/field';
import { textActionClass } from '@/lib/text-link';

/**
 * A corrected address for a likely domain typo (`jane@gmial.com` →
 * `jane@gmail.com`), offered under an email field. `check` runs on blur,
 * `offer` shows the correction the API sent with a refused submit
 * (`email_domain_undeliverable`), and `clear` hides it once the person edits
 * the address or takes the correction.
 */
export function useEmailSuggestion() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const check = useCallback(
    (email: string) => setSuggestion(suggestEmailAddress(email)),
    [],
  );
  const offer = useCallback(
    (email: string | null | undefined) => setSuggestion(email ?? null),
    [],
  );
  const clear = useCallback(() => setSuggestion(null), []);
  return { suggestion, check, offer, clear };
}

const EMAIL_SLOT = '\u0000';

/** "Did you mean jane@gmail.com?", where one tap on the address takes it. */
export function EmailSuggestionHint({
  suggestion,
  onAccept,
}: {
  suggestion: string | null;
  onAccept: (email: string) => void;
}) {
  if (!suggestion) return null;
  // The sentence is one message so each language orders it its own way; the
  // address is the button inside it.
  const [before = '', after = ''] = m
    .emailSuggestion_didYouMeanText({ email: EMAIL_SLOT })
    .split(EMAIL_SLOT);
  return (
    <FieldDescription data-test="email-suggestion">
      {before}
      <button
        type="button"
        className={textActionClass}
        data-test="email-suggestion-accept"
        onClick={() => onAccept(suggestion)}
      >
        {suggestion}
      </button>
      {after}
    </FieldDescription>
  );
}
