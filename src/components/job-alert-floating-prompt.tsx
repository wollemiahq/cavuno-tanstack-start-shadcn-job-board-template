"use client";

import { useEffect, useState } from "react";

import { XIcon } from "lucide-react";

import type { JobAlertDefaults } from "../lib/job-alert-defaults";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { AlertSignupForm } from "@/components/board/alert-signup-form";
import { Button } from "@/components/ui/button";
import { m } from "../paraglide/messages";
import { subscribeJobAlert } from "../server/queries";

const SUPPRESS_KEY = "cavuno:job-alert-prompt-dismissed-until";
const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The hosted board's dismissible bottom-corner job-alert prompt on listing
 * pages. Renders only after mount (avoids an SSR/client mismatch) and stays
 * hidden for 30 days after a dismiss (localStorage, mirroring the hosted
 * suppression cookie).
 */
export function JobAlertFloatingPrompt({
  defaults,
  language,
  labels,
}: {
  defaults: JobAlertDefaults;
  language: string;
  labels?: BoardLabelOverrides;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const until = Number(localStorage.getItem(SUPPRESS_KEY) ?? 0);
    if (!Number.isFinite(until) || Date.now() > until) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-test="job-alert-floating-prompt"
      className="fixed right-4 bottom-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-card text-card-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={m.jobAlertFloatingPrompt_dismissAriaLabel()}
        onClick={() => {
          localStorage.setItem(SUPPRESS_KEY, String(Date.now() + SUPPRESS_MS));
          setVisible(false);
        }}
        className="absolute top-2 right-2"
      >
        <XIcon aria-hidden="true" />
      </Button>
      <AlertSignupForm
        filters={defaults.filters}
        context={defaults.context}
        language={language}
        labels={labels}
        onSubscribe={async (input) => {
          const result = await subscribeJobAlert({ data: input });
          return { status: result.status };
        }}
        // Listing-page alert variant — stored as jobCardLabels.jobAlert
        // {Title,Description} on the hosted board; the starter's English
        // is the floor (catalog variant keys land with the authed slice).
        title={labels?.jobCardLabels?.jobAlertTitle || m.jobAlertFloatingPrompt_defaultTitle()}
        description={
          labels?.jobCardLabels?.jobAlertDescription ||
          m.jobAlertFloatingPrompt_defaultDescription()
        }
      />
    </div>
  );
}
