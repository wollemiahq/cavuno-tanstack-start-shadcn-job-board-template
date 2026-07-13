"use client";

import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveJobButton({
  jobId,
  viewer,
  labels,
  onSave,
  onSaved,
}: {
  jobId: string;
  viewer: { emailVerified: boolean } | null;
  labels: {
    save: string;
    saving: string;
    saved: string;
  };
  onSave: (jobId: string) => Promise<void>;
  onSaved?: () => Promise<void> | void;
}) {
  const [trackedJobId, setTrackedJobId] = useState(jobId);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  if (trackedJobId !== jobId) {
    setTrackedJobId(jobId);
    setState("idle");
  }

  if (!viewer) {
    return (
      <a href="/auth/sign-in" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {labels.save}
      </a>
    );
  }

  if (!viewer.emailVerified) {
    return (
      <a
        href="/auth/verify-email-required"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        {labels.save}
      </a>
    );
  }

  if (state === "saved") {
    return (
      <a href="/account" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {labels.saved}
      </a>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn(state === "saving" && "cursor-wait")}
      disabled={state === "saving"}
      onClick={async () => {
        setState("saving");
        try {
          await onSave(jobId);
          await onSaved?.();
          setState("saved");
        } catch (error) {
          setState("idle");
          if (String(error).includes("EMAIL_UNVERIFIED")) {
            window.location.assign("/auth/verify-email-required");
            return;
          }
          throw error;
        }
      }}
    >
      {state === "saving" ? labels.saving : labels.save}
    </Button>
  );
}
