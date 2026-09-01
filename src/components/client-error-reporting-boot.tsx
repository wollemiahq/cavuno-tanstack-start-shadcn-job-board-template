"use client";

import { useEffect } from "react";

import { useClientErrorReport } from "@/lib/use-client-error-report";

/**
 * Idle-installs window error listeners after first paint so the happy path
 * pays no network and almost no JS (this file is a few lines; the listener
 * module loads idle). Route errorComponents still report immediately.
 */
export function ClientErrorReportingBoot() {
  useEffect(() => {
    const run = () => {
      void import("@/lib/install-client-error-reporting").then((mod) => {
        mod.installClientErrorReporting();
      });
    };
    const idleId = window.requestIdleCallback?.(run);
    if (idleId === undefined) {
      const timeoutId = window.setTimeout(run, 1);
      return () => window.clearTimeout(timeoutId);
    }
    return () => window.cancelIdleCallback(idleId);
  }, []);

  return null;
}

/** Mount inside a route errorComponent (server or client). */
export function ClientErrorReporter({ error }: { error: Error & { digest?: string } }) {
  useClientErrorReport(error);
  return null;
}
