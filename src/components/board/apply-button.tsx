'use client';

/**
 * Native apply with the hosted board's fallback ladder. Pure markup and
 * interaction over `ApplyButtonVM`: the
 * decision ladder and copy are resolved by `toApplyButtonVM`
 * (src/board/apply-view-model.ts), so this file imports nothing from
 * `@cavuno/board*` or `#/copy` and the button can be restyled freely.
 *
 * The invariant stays in the SDK's pure `resolveApplyAction`: an external
 * `applicationUrl`, when present, is the apply path for EVERYONE —
 * anonymous, unverified, or verified — so a signed-in-but-unverified
 * candidate is never worse off than an anonymous visitor. Only a
 * native-apply job with no external URL routes an unverified candidate to
 * the verify gate.
 *
 * The auth/verify/applications paths are plain hrefs — point them at
 * your app's routes and swap `<a>` for your router's Link if desired.
 */
import { lazy, Suspense, useState, type FormEvent } from 'react';

import { m } from '../../paraglide/messages';

import {
  toApplyButtonVM,
  type PublicApplyAction,
} from '@/board/apply-view-model';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  candidateSignInHref,
  candidateVerifyEmailHref,
} from '@/lib/candidate-return-to';
import { NativeApplyApprovalError, runNativeApply } from '@/lib/native-apply';

const ApplyLocationDialog = lazy(() =>
  import('./apply-location-dialog').then((module) => ({
    default: module.ApplyLocationDialog,
  })),
);

export function ApplyButton({
  jobSlug,
  applicationUrl,
  applyAction,
  viewer,
  language,
  returnTo,
  onPrepareApply,
  onApply,
  alreadyApplied = false,
  applicationsHref = '/me/applications',
  nativeApplications = true,
}: {
  /** Null when the job has no native-apply support (external-only). */
  jobSlug: string | null;
  /** The employer's external application URL, when the job carries one. */
  applicationUrl: string | null;
  /** Cavuno's server-supplied Apply contract (absent for pre-gateway data). */
  applyAction?: PublicApplyAction | null;
  /** Session state: null = anonymous. */
  viewer: { emailVerified: boolean } | null;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Complete internal URL to restore after candidate authentication. */
  returnTo: string;
  /**
   * Perform the native apply. Throw an error whose message contains
   * `EMAIL_UNVERIFIED` to route the candidate to the verify page (the
   * Board API error code for a stale verification state).
   */
  /** Ask Cavuno whether this native Apply needs a browser-edge receipt. */
  onPrepareApply: (jobSlug: string) => Promise<unknown>;
  /** Submit natively; a receipt id is present only when preparation required it. */
  onApply: (jobSlug: string, approvalReceipt?: string) => Promise<void>;
  /**
   * Seed the "already applied" state from server data — pass the loader's
   * prior-application status (e.g. `board.jobs.myApplication(jobSlug)`) so
   * a returning visitor sees "Applied" instead of the apply button again.
   */
  alreadyApplied?: boolean;
  applicationsHref?: string;
  /**
   * Board feature flag (`board.features.nativeApplications`, default-on).
   * `false` ⇒ external-apply-only: a native-only job renders nothing rather
   * than a dead-end apply form (the platform 422s the native apply).
   */
  nativeApplications?: boolean;
}) {
  // Only the transient in-session interaction lives in state; the
  // returning-visitor "applied" truth comes from the `alreadyApplied`
  // prop (server data). Reset the transient state when the job changes —
  // a component instance reused across client-side navigation (same tree
  // position, new `jobSlug`) must not carry Job A's "applied" onto Job B.
  const [state, setState] = useState<
    'idle' | 'applying' | 'applied' | 'error' | 'location-denied'
  >('idle');
  const [trackedJob, setTrackedJob] = useState(jobSlug);
  if (jobSlug !== trackedJob) {
    setTrackedJob(jobSlug);
    setState('idle');
  }

  const { action, copy } = toApplyButtonVM({
    jobSlug,
    applicationUrl,
    applyAction,
    viewer,
    applied: alreadyApplied || state === 'applied',
    language,
    nativeApplications,
  });
  const locationDialog =
    state === 'location-denied' ? (
      <Suspense fallback={null}>
        <ApplyLocationDialog
          open
          title={copy.locationUnavailableTitle}
          description={copy.locationNotEligibleError}
          onClose={() => setState('idle')}
        />
      </Suspense>
    ) : null;

  switch (action.kind) {
    case 'none':
      return null;
    case 'external':
      return (
        <a
          href={action.url}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: 'lg' })}
        >
          {/* Primary apply label is just "Apply"; the SDK's
              longer applyOnEmployerSiteLabel is dropped from the CTA. */}
          {m.applyButton_applyLabel()}
        </a>
      );
    case 'gateway-external':
      // No gateway or provider URL is emitted into the page. The POST target
      // is this board's own stable route; on click the browser asks Cavuno's
      // user-edge gateway for the canonical decision directly.
      return (
        <div className="flex flex-col gap-1">
          <form
            method="post"
            action="/apply"
            onSubmit={async (event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = event.currentTarget;
              setState('applying');
              try {
                const { requestGatewayApply } =
                  await import('@/lib/gateway-apply');
                const result = await requestGatewayApply(form);
                if (result.kind === 'location-denied') {
                  setState('location-denied');
                  return;
                }
                window.location.assign(result.redirectUrl);
              } catch {
                setState('error');
              }
            }}
          >
            <input type="hidden" name="jobSlug" value={action.jobSlug} />
            <Button type="submit" size="lg" disabled={state === 'applying'}>
              {state === 'applying'
                ? copy.applyingLabel
                : m.applyButton_applyLabel()}
            </Button>
          </form>
          {state === 'error' ? (
            <p role="alert" className="text-destructive text-sm">
              {copy.applicationSubmitError}
            </p>
          ) : null}
          {locationDialog}
        </div>
      );
    case 'sign-in':
      return (
        <a
          href={candidateSignInHref(returnTo)}
          className={buttonVariants({ size: 'lg' })}
        >
          {m.applyButton_applyLabel()}
        </a>
      );
    case 'verify-email':
      return (
        <a
          href={candidateVerifyEmailHref(returnTo)}
          className={buttonVariants({ size: 'lg' })}
        >
          {m.applyButton_applyLabel()}
        </a>
      );
    case 'applied':
      return (
        <a
          href={applicationsHref}
          className={buttonVariants({ variant: 'secondary', size: 'lg' })}
        >
          {copy.appliedViewApplicationsLabel}
        </a>
      );
    case 'native':
      return (
        <div className="flex flex-col gap-1">
          <Button
            size="lg"
            disabled={state === 'applying'}
            onClick={async () => {
              setState('applying');
              try {
                await runNativeApply({
                  jobSlug: action.jobSlug,
                  prepare: onPrepareApply,
                  submit: onApply,
                });
                setState('applied');
              } catch (error) {
                // A stale verification state routes to the verify page;
                // any other failure surfaces loudly (never a silent
                // revert — "fail loud", and never an unhandled rejection).
                if (String(error).includes('EMAIL_UNVERIFIED')) {
                  window.location.assign(candidateVerifyEmailHref(returnTo));
                  return;
                }
                setState(
                  error instanceof NativeApplyApprovalError &&
                    error.reason === 'denied'
                    ? 'location-denied'
                    : 'error',
                );
              }
            }}
          >
            {state === 'applying'
              ? copy.applyingLabel
              : m.applyButton_applyLabel()}
          </Button>
          {state === 'error' ? (
            <p role="alert" className="text-destructive text-sm">
              {copy.applicationSubmitError}
            </p>
          ) : null}
          {locationDialog}
        </div>
      );
  }
}
