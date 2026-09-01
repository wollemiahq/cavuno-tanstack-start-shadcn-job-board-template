import { reportClientError } from "./client-error-report";

let installed = false;

function isIgnoredErrorEvent(event: ErrorEvent): boolean {
  const source = event.filename ?? "";
  if (source.startsWith("chrome-extension://") || source.startsWith("moz-extension://")) {
    return true;
  }
  // Cross-origin scripts surface as this opaque string; no stack to act on.
  return event.message === "Script error.";
}

function reportThrown(value: Error | string, fallbackName: string) {
  if (value instanceof Error) {
    reportClientError(value);
    return;
  }
  reportClientError(Object.assign(new Error(value || "unknown"), { name: fallbackName }));
}

export function resetClientErrorReportingInstall() {
  installed = false;
}

/**
 * Window-level backstop for crashes that never hit a route errorComponent
 * (the talent `RangeError: Invalid time value` was one). Call once per
 * document, after first paint — listeners are free; the beacon is not.
 */
export function installClientErrorReporting() {
  if (installed) return;
  if (!("document" in globalThis)) return;
  installed = true;

  window.addEventListener("error", (event) => {
    if (isIgnoredErrorEvent(event)) return;
    const thrown = event.error;
    if (thrown instanceof Error) {
      reportClientError(thrown);
      return;
    }
    reportThrown(event.message, "Error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      reportClientError(reason);
      return;
    }
    reportThrown(String(reason ?? "unknown"), "UnhandledRejection");
  });
}
