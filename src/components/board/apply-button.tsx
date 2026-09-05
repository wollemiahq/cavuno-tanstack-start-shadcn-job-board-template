'use client';

/**
 * Native apply with the hosted board's fallback ladder. Pure markup and
 * interaction over `ApplyButtonVM`: the
 * decision ladder and copy are resolved by `toApplyButtonVM`
 * (src/board/apply-view-model.ts), so this file imports no SDK formatters
 * or `#/copy` and the button can be restyled freely.
 *
 * The invariant stays in the SDK's pure `resolveApplyAction`: an external
 * `applicationUrl`, when present, is the apply path for EVERYONE —
 * anonymous, unverified, or verified — so a signed-in-but-unverified
 * candidate is never worse off than an anonymous visitor. Only a
 * native-apply job with no external URL routes an unverified candidate to
 * the verify gate.
 *
 * Auth/verify/applications CTAs use TanStack Link for same-origin SPA
 * navigation; external apply stays a plain `<a target="_blank">`.
 */
import { lazy, Suspense, useState, type FormEvent } from 'react';

import { analytics } from '@cavuno/board/analytics';
import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import {
  toApplyButtonVM,
  type PublicApplyAction,
} from '@/board/apply-view-model';
import { useBoardConversionAnalytics } from '@/components/board-conversion-analytics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { pushBoardConversionEvent } from '@/lib/board-pixel-conversions';
import {
  candidateAuthSearch,
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

/** File types Cavuno accepts for a per-application resume (hosted parity). */
const APPLICATION_RESUME_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt';

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
  onUploadResume,
  applicationState = 'not-requested',
  onRetryApplicationState,
  applicationsHref = '/me/applications',
  nativeApplications = true,
  registrationWall = false,
  onGuestApply,
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
  /**
   * Submit natively; a receipt id is present only when preparation required it.
   * `body` carries the candidate-supplied facts collected on this page (today
   * the optional cover note) — the platform accepts them on the same apply
   * call the guest form already uses.
   */
  onApply: (
    jobSlug: string,
    approvalReceipt?: string,
    body?: { coverNote?: string },
  ) => Promise<{ id: string } | void>;
  /**
   * Attach an optional per-application resume after a successful native
   * apply. Providing it is what renders the resume field: omit it and the
   * signed-in form collects a cover note only.
   */
  onUploadResume?: (input: {
    jobSlug: string;
    file: File;
  }) => Promise<{ id: string } | void>;
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
  /**
   * Board flag `features.registrationWall`. `true` ⇒ an anonymous visitor
   * gets the sign-in CTA on every apply path, the external employer link
   * included (hosted parity); the platform rejects their guest apply anyway.
   */
  registrationWall?: boolean;
  /**
   * Submit an anonymous guest application. Providing it is what tells the
   * decision ladder this UI HAS a guest form — omit it and an anonymous
   * visitor keeps getting the sign-in CTA.
   */
  onGuestApply?: (input: {
    jobSlug: string;
    name?: string;
    email: string;
    coverNote?: string;
  }) => Promise<
    { ok: true; applicationId: string } | { ok: false; reason: string }
  >;
  dependencies?: ApplyButtonDependencies;
}) {
  const conversion = useBoardConversionAnalytics();

  function trackApplyClick(applyType: 'external' | 'native') {
    if (jobId && jobSlug) {
      analytics.track('job_apply_click', {
        jobId,
        jobSlug,
        companySlug,
      });
    }
    if (conversion && jobId && jobSlug && companySlug) {
      pushBoardConversionEvent(conversion.analytics, {
        event: 'apply_click',
        job_id: jobId,
        job_slug: jobSlug,
        company_slug: companySlug,
        apply_type: applyType,
        board_slug: conversion.boardSlug,
      });
    }
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
    | 'idle'
    | 'applying'
    | 'applied'
    | 'error'
    | 'location-denied'
    | 'guest-submitted'
    | 'guest-not-allowed'
    | 'resume-error'
  >('idle');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCoverNote, setGuestCoverNote] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [trackedJob, setTrackedJob] = useState(jobSlug);
  if (jobSlug !== trackedJob) {
    setTrackedJob(jobSlug);
    setState('idle');
    setCoverNote('');
    setResumeFile(null);
  }

  const { action, copy } = toApplyButtonVM({
    jobSlug,
    applicationUrl,
    applyAction,
    viewer,
    applied: applicationState === 'applied' || state === 'applied',
    language,
    nativeApplications,
    registrationWall,
    allowGuestApply: onGuestApply !== undefined,
  });
  // Unknown private state must not hide an employer URL (or a native-off
  // collapse to `none`). The retry exists to stop a second *native*
  // submission when we cannot tell if one already exists.
  if (
    applicationState === 'unknown' &&
    action.kind !== 'external' &&
    action.kind !== 'gateway-external' &&
    action.kind !== 'none'
  ) {
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
        <Link
          to="/auth/sign-in"
          search={candidateAuthSearch(returnTo)}
          className={buttonVariants({ size: 'lg' })}
        >
          {m.applyButton_applyLabel()}
        </Link>
      );
    case 'verify-email':
      return (
        <Link
          to="/auth/verify-email-required"
          search={candidateAuthSearch(returnTo)}
          className={buttonVariants({ size: 'lg' })}
        >
          {m.applyButton_applyLabel()}
        </Link>
      );
    case 'applied':
      return (
        <Link
          to={applicationsHref}
          className={buttonVariants({ variant: 'secondary', size: 'lg' })}
        >
          {copy.appliedViewApplicationsLabel}
        </Link>
      );
    case 'guest':
      // Wall off ⇒ the platform accepts an anonymous apply. Collect the
      // employer's reply address inline rather than sending the candidate
      // through registration and losing the application.
      if (state === 'guest-submitted') {
        return (
          <Alert>
            <AlertDescription className="flex flex-col items-start gap-1">
              <span className="font-medium">{copy.guestSubmittedHeading}</span>
              <span>{copy.guestSubmittedText}</span>
            </AlertDescription>
          </Alert>
        );
      }
      return (
        <form
          method="post"
          className="flex flex-col gap-3"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!onGuestApply) return;
            setState('applying');
            // Guest apply IS a native apply — track it exactly as the
            // signed-in native path does, or the 129 wall-off boards go
            // dark in the conversion pipeline.
            trackApplyClick('native');
            try {
              const result = await onGuestApply({
                jobSlug: action.jobSlug,
                name: guestName.trim() || undefined,
                email: guestEmail.trim(),
                coverNote: guestCoverNote.trim() || undefined,
              });
              if (result.ok) {
                trackApplySubmit(result.applicationId);
              }
              setState(
                result.ok
                  ? 'guest-submitted'
                  : result.reason === 'guest_not_allowed'
                    ? 'guest-not-allowed'
                    : 'error',
              );
            } catch {
              setState('error');
            }
          }}
        >
          <p className="text-sm font-medium">{copy.guestApplyHeading}</p>
          <Field>
            <FieldLabel htmlFor="guest-apply-name">
              {copy.guestNameLabel}
            </FieldLabel>
            <Input
              id="guest-apply-name"
              name="name"
              autoComplete="name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="guest-apply-email">
              {copy.guestEmailLabel}
            </FieldLabel>
            <Input
              id="guest-apply-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="guest-apply-cover-note">
              {copy.guestCoverNoteLabel}
            </FieldLabel>
            <Textarea
              id="guest-apply-cover-note"
              name="coverNote"
              rows={4}
              value={guestCoverNote}
              onChange={(event) => setGuestCoverNote(event.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" disabled={state === 'applying'}>
            {state === 'applying' ? copy.applyingLabel : copy.guestSubmitLabel}
          </Button>
          <Link
            to="/auth/sign-in"
            search={candidateAuthSearch(returnTo)}
            className="text-muted-foreground text-sm underline"
          >
            {copy.guestSignInInsteadLabel}
          </Link>
          {state === 'guest-not-allowed' ? (
            <p role="alert" className="text-destructive text-sm">
              {copy.guestNotAllowedError}
            </p>
          ) : null}
          {state === 'error' ? (
            <p role="alert" className="text-destructive text-sm">
              {copy.applicationSubmitError}
            </p>
          ) : null}
        </form>
      );
    case 'native':
      // Hosted parity: a signed-in candidate may attach a cover note and a
      // per-application resume. Both are optional, so the one-click path
      // (submit straight away, profile resume attached server-side) stays
      // exactly one click.
      return (
        <form
          method="post"
          className="flex flex-col gap-3"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (state === 'resume-error') {
              // The application already exists; only the attachment is
              // outstanding. Re-running apply here would re-hash an edited
              // cover note and trip the approval replay guard.
              setState('applying');
              try {
                if (onUploadResume && resumeFile) {
                  await onUploadResume({
                    jobSlug: action.jobSlug,
                    file: resumeFile,
                  });
                }
                setState('applied');
              } catch {
                setState('resume-error');
              }
              return;
            }
            setState('applying');
            trackApplyClick('native');
            const note = coverNote.trim();
            try {
              const application = await runNativeApply({
                jobSlug: action.jobSlug,
                prepare: onPrepareApply,
                submit: (jobSlug, approvalReceipt) =>
                  onApply(
                    jobSlug,
                    approvalReceipt,
                    note ? { coverNote: note } : undefined,
                  ),
              });
              const applicationId = application?.id;
              if (applicationId !== undefined) {
                trackApplySubmit(applicationId);
              }
              // The application exists from here on. A failed resume upload
              // must not read as a failed application: say so, and leave the
              // form submittable so the candidate can retry the attachment
              // alone (see the `resume-error` branch above).
              if (onUploadResume && resumeFile) {
                try {
                  await onUploadResume({
                    jobSlug: action.jobSlug,
                    file: resumeFile,
                  });
                } catch {
                  setState('resume-error');
                  return;
                }
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
          <Field>
            <FieldLabel htmlFor="native-apply-cover-note">
              {copy.guestCoverNoteLabel}
            </FieldLabel>
            <Textarea
              id="native-apply-cover-note"
              name="coverNote"
              rows={4}
              value={coverNote}
              onChange={(event) => setCoverNote(event.target.value)}
            />
          </Field>
          {onUploadResume ? (
            <Field>
              <FieldLabel htmlFor="native-apply-resume">
                {m.applyButton_resumeLabel()}
              </FieldLabel>
              <Input
                // Uncontrolled: re-key per job so a file picked for the
                // previous job cannot linger in the DOM after a same-route
                // navigation (the similar-jobs rail) while state says none.
                key={jobSlug}
                id="native-apply-resume"
                name="resume"
                type="file"
                accept={APPLICATION_RESUME_ACCEPT}
                onChange={(event) =>
                  setResumeFile(event.target.files?.[0] ?? null)
                }
              />
            </Field>
          ) : null}
          <Button type="submit" size="lg" disabled={state === 'applying'}>
            {state === 'applying'
              ? copy.applyingLabel
              : m.applyButton_applyLabel()}
          </Button>
          {state === 'error' ? (
            <p role="alert" className="text-destructive text-sm">
              {copy.applicationSubmitError}
            </p>
          ) : null}
          {state === 'resume-error' ? (
            <p role="alert" className="text-destructive text-sm">
              {m.applyButton_resumeUploadError()}
            </p>
          ) : null}
          {locationDialog}
        </form>
      );
  }
}
