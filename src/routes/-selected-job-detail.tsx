import { useLocation, useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSessionUser, saveJob } from '../server/account';
import { applyToJob } from '../server/applications';
import { getBoardContext } from '../server/queries';

import type { SelectedJobState } from './-use-selected-job';
import { toJobDetailVM } from '@/board/job-detail-view-model';
import { ApplyButton } from '@/components/board/apply-button';
import { JobSearchDetailState } from '@/components/board/job-search-detail-state';
import { JobSearchResultDetail } from '@/components/board/job-search-result-detail';
import { SaveJobButton } from '@/components/board/save-job-button';
import { companyIntro } from '@/lib/company-intro';

export function SelectedJobDetail({
  state,
  board,
  user,
  saveSlot,
}: {
  state: SelectedJobState;
  board: Awaited<ReturnType<typeof getBoardContext>>;
  user: Awaited<ReturnType<typeof getSessionUser>>;
  /** Override for surfaces where the job is already saved (saved-jobs page). */
  saveSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const returnTo = useLocation({ select: (location) => location.href });
  const vm = state.job
    ? toJobDetailVM(
        state.job,
        board.customFields,
        [],
        companyIntro(null, state.companyDescription),
        getLocale(),
      )
    : undefined;

  // On a failed transition the previous job stays readable but its actions must
  // not be operable — the same inert guard the detail-state block used to own.
  const inertOnError = (slot: React.ReactNode) =>
    state.status === 'error' ? (
      <span data-inert="true" inert className="contents">
        {slot}
      </span>
    ) : (
      slot
    );

  const applySlot = state.job ? (
    <ApplyButton
      jobSlug={state.job.slug}
      applicationUrl={state.job.applicationUrl}
      language={board.language}
      returnTo={returnTo}
      nativeApplications={board.features.nativeApplications}
      viewer={user ? { emailVerified: user.emailVerified } : null}
      alreadyApplied={state.alreadyApplied}
      onApply={async (jobSlug) => {
        await applyToJob({ data: { jobSlug } });
      }}
    />
  ) : undefined;

  const saveSlotNode =
    saveSlot !== undefined ? (
      saveSlot
    ) : state.job ? (
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
    ) : undefined;

  // Assemble the detail node here (Layer 2 pane), handing the detail-state a
  // prebuilt `detail` like its company/talent siblings. The pending skeleton
  // and error/idle chrome stay in the dumb wrapper; `loading` is always false
  // because the wrapper renders the skeleton for the loading status itself.
  const detail = vm?.detailHref ? (
    <JobSearchResultDetail
      vm={vm}
      loading={false}
      loadingLabel={m.jobSearch_detailLoadingLabel()}
      applySlot={inertOnError(applySlot)}
      saveSlot={inertOnError(saveSlotNode)}
    />
  ) : undefined;

  return (
    <JobSearchDetailState
      status={state.status}
      detail={detail}
      loadingLabel={m.jobSearch_detailLoadingLabel()}
      errorTitle={m.jobSearch_detailErrorTitle()}
      retryLabel={m.jobSearch_retryLabel()}
      onRetry={state.retry}
    />
  );
}
