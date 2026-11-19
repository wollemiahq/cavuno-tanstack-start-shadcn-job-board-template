'use client';

import { subscribeJobAlert } from '../server/queries';
import { JobAlertFloatingPromptView } from './job-alert-floating-prompt-view';

import type { JobAlertDefaults } from '../lib/job-alert-defaults';

/**
 * The hosted board's dismissible bottom-corner job-alert prompt on listing
 * pages. Renders only after mount (avoids an SSR/client mismatch) and stays
 * hidden for 30 days after a dismiss (localStorage, mirroring the hosted
 * suppression cookie).
 */
export function JobAlertFloatingPrompt({
  defaults,
  language,
}: {
  defaults: JobAlertDefaults;
  language: string;
}) {
  return (
    <JobAlertFloatingPromptView
      defaults={defaults}
      language={language}
      subscribe={(input) => subscribeJobAlert({ data: input })}
    />
  );
}

export { JobAlertFloatingPromptView } from './job-alert-floating-prompt-view';
