'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import {
  MARKETING_CONSENT,
  type MarketingConsentState,
} from '../lib/marketing-consent';
import { m } from '../paraglide/messages';
import { setMarketingConsent } from '../server/settings';

import { Checkbox } from '@/components/ui/checkbox';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';

export type UpdateMarketingConsent = (
  input: Parameters<typeof setMarketingConsent>[0],
) => ReturnType<typeof setMarketingConsent>;

/**
 * Marketing-consent row for /settings — grant AND withdraw, beside this
 * app's own disclosure copy. Granting from a settings page is safe only
 * because the wording renders right here; a bare toggle with no stated copy
 * would not be consent.
 *
 * Consent defaults to OFF: `null` (never decided) and `withdrawn` both
 * render unticked. This is deliberately unlike the notification channels
 * above it, which default to subscribed.
 */
export function MarketingConsentSettingsView({
  consent,
  updateConsent,
  invalidate,
}: {
  consent: MarketingConsentState | null;
  updateConsent: UpdateMarketingConsent;
  invalidate: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const granted = consent?.status === 'granted';

  return (
    <div className="space-y-3">
      <ul
        className="divide-border divide-y"
        data-test="marketing-consent-settings"
      >
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-medium">{m.marketingConsent_settingsTitle()}</p>
            <p className="text-muted-foreground text-sm">
              {m.marketingConsent_settingsDescription()}
              {MARKETING_CONSENT.privacyPolicyUrl ? (
                <>
                  {' '}
                  <a
                    href={MARKETING_CONSENT.privacyPolicyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground underline"
                  >
                    {m.marketingConsent_privacyLinkLabel()}
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <Checkbox
            className="shrink-0"
            aria-label={m.marketingConsent_settingsTitle()}
            checked={granted}
            disabled={pending}
            data-test="marketing-consent-toggle"
            onCheckedChange={async (isSelected) => {
              setPending(true);
              try {
                await updateConsent({
                  data: { granted: isSelected === true },
                });
              } catch {
                void toastActionError();
                setPending(false);
                return;
              }
              void toastActionSuccess();
              await reconcileCommittedAction(invalidate);
              setPending(false);
            }}
          />
        </li>
      </ul>
    </div>
  );
}

export function MarketingConsentSettings({
  consent,
}: {
  consent: MarketingConsentState | null;
}) {
  const router = useRouter();
  return (
    <MarketingConsentSettingsView
      consent={consent}
      updateConsent={setMarketingConsent}
      invalidate={() => router.invalidate()}
    />
  );
}
