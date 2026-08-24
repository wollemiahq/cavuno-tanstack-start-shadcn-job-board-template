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
    const until = Number(localStorage.getItem(SUPPRESS_KEY) ?? 0);
    if (!Number.isFinite(until) || Date.now() > until) setVisible(true);
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
            localStorage.setItem(
              SUPPRESS_KEY,
              String(Date.now() + SUPPRESS_MS),
            );
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
