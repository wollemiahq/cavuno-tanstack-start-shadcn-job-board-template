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
import { useBoardConversionAnalytics } from '@/components/board-conversion-analytics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { pushBoardConversionEvent } from '@/lib/board-pixel-conversions';
import {
  candidateSignInHref,
  candidateVerifyEmailHref,
} from '@/lib/candidate-return-to';
import {
  NativeApplyApprovalError,
  runNativeApply,
  type NativeApplyPrepareResult,
} from '@/lib/native-apply';

const ApplyLocationDialog = lazy(() =>
  import('./apply-location-dialog').then((module) => ({
    default: module.ApplyLocationDialog,
  })),
);

export type ApplyButtonDependencies = {
  loadGatewayApply: () => Promise<
    Pick<
      typeof import('@/lib/gateway-apply'),
      'navigateToExternalApply' | 'requestGatewayApply'
    >
  >;
};

const applyButtonDependencies: ApplyButtonDependencies = {
  loadGatewayApply: () => import('@/lib/gateway-apply'),
};

export function ApplyButton({
  jobId,
  jobSlug,
  companySlug,
  applicationUrl,
  applyAction,
  viewer,
  language,
  returnTo,
  onPrepareApply,
  onApply,
  applicationState = 'not-requested',
  onRetryApplicationState,
  applicationsHref = '/me/applications',
  nativeApplications = true,
  dependencies = applyButtonDependencies,
}: {
  /** Cavuno job id for conversion payloads. */
  jobId: string;
  /** Null when the job has no native-apply support (external-only). */
  jobSlug: string | null;
  /** Company slug for conversion payloads and typed routes. */
  companySlug: string;
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
  onPrepareApply: (jobSlug: string) => Promise<NativeApplyPrepareResult>;
  /** Submit natively; a receipt id is present only when preparation required it. */
  onApply: (
    jobSlug: string,
    approvalReceipt?: string,
  ) => Promise<{ id: string } | void>;
  /**
   * Seed the private application lookup. `unknown` is deliberately distinct
   * from `not-applied`: it blocks another submission until a retry resolves.
   */
  applicationState?: 'not-requested' | 'applied' | 'not-applied' | 'unknown';
  /** Retry the independent private application-state read. */
  onRetryApplicationState?: () => void;
  applicationsHref?: string;
  /**
   * Board feature flag (`board.features.nativeApplications`, default-on).
   * `false` ⇒ external-apply-only: a native-only job renders nothing rather
   * than a dead-end apply form (the platform 422s the native apply).
   */
  nativeApplications?: boolean;
  dependencies?: ApplyButtonDependencies;
}) {
  const conversion = useBoardConversionAnalytics();

  function trackApplyClick(applyType: 'external' | 'native') {
    if (!conversion || !jobId || !jobSlug || !companySlug) return;
    pushBoardConversionEvent(conversion.analytics, {
      event: 'apply_click',
      job_id: jobId,
      job_slug: jobSlug,
      company_slug: companySlug,
      apply_type: applyType,
      board_slug: conversion.boardSlug,
    });
  }

  function trackApplySubmit(applicationId: string) {
    if (!conversion || !jobId || !jobSlug || !companySlug) return;
    pushBoardConversionEvent(conversion.analytics, {
      event: 'apply_submit',
      job_id: jobId,
      application_id: applicationId,
      job_slug: jobSlug,
      company_slug: companySlug,
      board_slug: conversion.boardSlug,
    });
  }
  // Only the transient in-session interaction lives in state; the
  // returning-visitor "applied" truth comes from the `applicationState`
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

  if (applicationState === 'unknown') {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{m.applyButton_applicationStateUnknownText()}</span>
          <Button
            type="button"
            variant="outline"
            onClick={onRetryApplicationState}
            disabled={!onRetryApplicationState}
          >
            {m.applyButton_retryApplicationStateLabel()}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { action, copy } = toApplyButtonVM({
    jobSlug,
    applicationUrl,
    applyAction,
    viewer,
    applied: applicationState === 'applied' || state === 'applied',
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
          onClick={() => trackApplyClick('external')}
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
                const { navigateToExternalApply, requestGatewayApply } =
                  await dependencies.loadGatewayApply();
                const result = await requestGatewayApply(form);
                if (result.kind === 'location-denied') {
                  setState('location-denied');
                  return;
                }
                trackApplyClick('external');
                navigateToExternalApply(result.redirectUrl);
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
              trackApplyClick('native');
              try {
                const application = await runNativeApply({
                  jobSlug: action.jobSlug,
                  prepare: onPrepareApply,
                  submit: onApply,
                });
                if (
                  application &&
                  typeof application === 'object' &&
                  'id' in application &&
                  typeof application.id === 'string'
                ) {
                  trackApplySubmit(application.id);
                }
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
