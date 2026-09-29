'use client';

import { useEffect, useState } from 'react';

import { XIcon } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { JobAlertDefaults } from '../lib/job-alert-defaults';
import { AlertSignupForm } from '@/components/board/alert-signup-form';
import { useCookieConsent } from '@/components/cookie-consent';
import { FloatingStackItem } from '@/components/floating-stack';
import { Button } from '@/components/ui/button';

const SUPPRESS_KEY = 'cavuno:job-alert-prompt-dismissed-until';
const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

// `localStorage` is null in an Android WebView without DOM storage and
// throws when site data is blocked. The dismissal is a nicety: without
// storage the prompt shows and a dismiss lasts for this page only.
function isSuppressed(): boolean {
  try {
    const until = Number(localStorage.getItem(SUPPRESS_KEY) ?? 0);
    return Number.isFinite(until) && Date.now() <= until;
  } catch {
    return false;
  }
}

function suppress() {
  try {
    localStorage.setItem(SUPPRESS_KEY, String(Date.now() + SUPPRESS_MS));
  } catch {
    // Storage unavailable: hiding it for this page is all we can do.
  }
}

export function JobAlertFloatingPromptView({
  defaults,
  language,
  subscribe,
}: {
  defaults: JobAlertDefaults;
  language: string;
  subscribe: React.ComponentProps<typeof AlertSignupForm>['onSubscribe'];
}) {
  const [visible, setVisible] = useState(false);
  const { bannerOpen } = useCookieConsent();

  useEffect(() => {
    if (!isSuppressed()) setVisible(true);
  }, []);

  if (!visible || bannerOpen) return null;

  return (
    <FloatingStackItem
      order={10}
      className="relative w-80 max-w-[calc(100vw-2rem)]"
    >
      <div data-test="job-alert-floating-prompt">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={m.jobAlertFloatingPrompt_dismissAriaLabel()}
          onClick={() => {
            suppress();
            setVisible(false);
          }}
          className="absolute end-2 top-2"
        >
          <XIcon aria-hidden="true" />
        </Button>
        <AlertSignupForm
          surface="card"
          filters={defaults.filters}
          context={defaults.context}
          language={language}
          onSubscribe={subscribe}
          title={m.jobAlertFloatingPrompt_defaultTitle()}
          description={m.jobAlertFloatingPrompt_defaultDescription()}
        />
      </div>
    </FloatingStackItem>
  );
}
