import { KeyRound } from 'lucide-react';

import { m } from '../paraglide/messages';

import { Button } from '@/components/ui/button';
import type { SsoChoice } from '@/lib/board-sign-in';

/**
 * One "Continue with {label}" button per SSO connection the board offers,
 * styled like the Google and LinkedIn buttons. The operator's logo renders
 * when set; otherwise a neutral key glyph stands in.
 */
export function SsoConnectionButtons({
  choices,
  disabled,
  onSelect,
}: {
  choices: readonly SsoChoice[];
  disabled: boolean;
  onSelect: (choice: SsoChoice) => void;
}) {
  return choices.map((choice) => (
    <Button
      key={`${choice.role}:${choice.connection.id}`}
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={disabled}
      onClick={() => onSelect(choice)}
    >
      {choice.connection.logoUrl ? (
        <img
          src={choice.connection.logoUrl}
          alt=""
          className="size-4 shrink-0 object-contain"
        />
      ) : (
        <KeyRound aria-hidden />
      )}
      {m.authSso_continueWithLabel({ label: choice.connection.label })}
    </Button>
  ));
}
