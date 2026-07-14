"use client";

/**
 * Native apply (ADR-0054) with the hosted board's fallback ladder. Now
 * PURE MARKUP + interaction over `ApplyButtonVM` (ADR-0070 Phase 2): the
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
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackJobApplyClick } from "@/lib/analytics";
import { candidateSignInHref, candidateVerifyEmailHref } from "@/lib/candidate-return-to";
import { toApplyButtonVM, type BoardLabelOverrides } from "@/board/apply-view-model";
import { m } from "../../paraglide/messages";

export function ApplyButton({
  jobId,
  companySlug,
  jobSlug,
  applicationUrl,
  viewer,
  language,
  returnTo,
  labels,
  onApply,
  alreadyApplied = false,
  applicationsHref = "/me/applications",
}: {
  /** Convex job _id — keys the `job_apply_click` analytics event (P2). */
  jobId: string;
  /** Company slug for the analytics payload, when known. */
  companySlug?: string;
  /** Null when the job has no native-apply support (external-only). */
  jobSlug: string | null;
  /** The employer's external application URL, when the job carries one. */
  applicationUrl: string | null;
  /** Session state: null = anonymous. */
  viewer: { emailVerified: boolean } | null;
  /** Board language (ISO code) from `board.context()`. */
  language: string;
  /** Complete internal URL to restore after candidate authentication. */
  returnTo: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  /**
   * Perform the native apply. Throw an error whose message contains
   * `EMAIL_UNVERIFIED` to route the candidate to the verify page (the
   * Board API error code for a stale verification state).
   */
  onApply: (jobSlug: string) => Promise<void>;
  /**
   * Seed the "already applied" state from server data — pass the loader's
   * prior-application status (e.g. `board.jobs.myApplication(jobSlug)`) so
   * a returning visitor sees "Applied" instead of the apply button again.
   */
  alreadyApplied?: boolean;
  applicationsHref?: string;
}) {
  // Only the transient in-session interaction lives in state; the
  // returning-visitor "applied" truth comes from the `alreadyApplied`
  // prop (server data). Reset the transient state when the job changes —
  // a component instance reused across client-side navigation (same tree
  // position, new `jobSlug`) must not carry Job A's "applied" onto Job B.
  const [state, setState] = useState<"idle" | "applying" | "applied" | "error">("idle");
  const [trackedJob, setTrackedJob] = useState(jobSlug);
  if (jobSlug !== trackedJob) {
    setTrackedJob(jobSlug);
    setState("idle");
  }

  const { action, copy } = toApplyButtonVM({
    jobSlug,
    applicationUrl,
    viewer,
    applied: alreadyApplied || state === "applied",
    language,
    labels,
  });

  switch (action.kind) {
    case "none":
      return null;
    case "external":
      return (
        <a
          href={action.url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
          // The outbound click IS the apply for external jobs — record it
          // for employer reporting (hosted parity; P2).
          onClick={() => trackJobApplyClick({ jobId, companySlug })}
        >
          {/* Primary apply label is just "Apply" (CAV-500); the SDK's
              longer applyOnEmployerSiteLabel is dropped from the CTA. */}
          {m.applyButton_applyLabel()}
        </a>
      );
    case "sign-in":
      return (
        <a
          href={candidateSignInHref(returnTo)}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {copy.signInToApplyLabel}
        </a>
      );
    case "verify-email":
      return (
        <a
          href={candidateVerifyEmailHref(returnTo)}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {copy.verifyEmailToApplyLabel}
        </a>
      );
    case "applied":
      return (
        <a
          href={applicationsHref}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
        >
          {copy.appliedViewApplicationsLabel}
        </a>
      );
    case "native":
      return (
        <div className="flex flex-col gap-1">
          <Button
            size="lg"
            className="w-full"
            disabled={state === "applying"}
            onClick={async () => {
              // Fired only on the press that performs the apply — the
              // sign-in/verify walls above never emit ("forcing sign-up
              // isn't an apply"), and the applied state renders a link.
              trackJobApplyClick({ jobId, companySlug });
              setState("applying");
              try {
                await onApply(action.jobSlug);
                setState("applied");
              } catch (error) {
                // A stale verification state routes to the verify page;
                // any other failure surfaces loudly (never a silent
                // revert — "fail loud", and never an unhandled rejection).
                if (String(error).includes("EMAIL_UNVERIFIED")) {
                  window.location.assign(candidateVerifyEmailHref(returnTo));
                  return;
                }
                setState("error");
              }
            }}
          >
            {state === "applying" ? copy.applyingLabel : m.applyButton_applyLabel()}
          </Button>
          {state === "error" ? (
            <p role="alert" className="text-sm text-destructive">
              {copy.applicationSubmitError}
            </p>
          ) : null}
        </div>
      );
  }
}
