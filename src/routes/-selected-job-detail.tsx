import { useLocation, useRouter } from "@tanstack/react-router";

import { toJobDetailVM } from "@/board/job-detail-view-model";
import { ApplyButton } from "@/components/board/apply-button";
import { JobSearchDetailState } from "@/components/board/job-search-detail-state";
import { SaveJobButton } from "@/components/board/save-job-button";
import { m } from "../paraglide/messages";
import { getSessionUser, saveJob } from "../server/account";
import { applyToJob } from "../server/applications";
import { getBoardContext } from "../server/queries";
import type { SelectedJobState } from "./-use-selected-job";

export function SelectedJobDetail({
  state,
  board,
  user,
}: {
  state: SelectedJobState;
  board: Awaited<ReturnType<typeof getBoardContext>>;
  user: Awaited<ReturnType<typeof getSessionUser>>;
}) {
  const router = useRouter();
  const returnTo = useLocation({ select: (location) => location.href });
  const vm = state.job
    ? toJobDetailVM(state.job, board.customFields, [], null, board.language, board.labels)
    : undefined;

  return (
    <JobSearchDetailState
      status={state.status}
      vm={vm}
      loadingLabel={m.jobSearch_detailLoadingLabel()}
      errorTitle={m.jobSearch_detailErrorTitle()}
      retryLabel={m.jobSearch_retryLabel()}
      fullPageLabel={m.jobSearch_viewFullJobLabel()}
      onRetry={state.retry}
      applySlot={
        state.job ? (
          <ApplyButton
            jobId={state.job.id}
            companySlug={state.job.company?.slug ?? undefined}
            jobSlug={state.job.slug}
            applicationUrl={state.job.applicationUrl}
            language={board.language}
            returnTo={returnTo}
            labels={board.labels}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            alreadyApplied={state.alreadyApplied}
            onApply={async (jobSlug) => {
              await applyToJob({ data: { jobSlug } });
            }}
          />
        ) : undefined
      }
      saveSlot={
        state.job ? (
          <SaveJobButton
            jobId={state.job.id}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            returnTo={returnTo}
            labels={{
              save: m.companyJobDetail_saveJobLabel(),
              saving: m.companyJobDetail_savingLabel(),
              saved: m.companyJobDetail_savedViewInAccountLabel(),
              error: m.saveJobButton_errorText(),
            }}
            onSave={async (jobId) => {
              await saveJob({ data: { jobId } });
            }}
            onSaved={() => router.invalidate()}
          />
        ) : undefined
      }
    />
  );
}
