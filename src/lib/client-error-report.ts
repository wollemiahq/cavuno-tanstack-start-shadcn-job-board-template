/**
 * Browser crash reports. Same-origin only — the Worker owns forwarding so
 * the page never learns about Axiom (Shopify Monorail pattern). Happy path
 * cost is zero network; sendBeacon/fetch keepalive run only after a crash.
 */

export const CLIENT_ERROR_PATH = '/.well-known/cavuno/client-error';

const STACK_MAX = 4000;
const COMPONENT_STACK_MAX = 2000;
const reported = new Set<string>();

type ReportableError = Error & {
  digest?: string;
  componentStack?: string;
};

function clip(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function fingerprint(error: ReportableError, path: string): string {
  return `${error.name}:${(error.message || '').slice(0, 80)}:${path}`;
}

export function resetClientErrorReports() {
  reported.clear();
}

/**
 * Fire-and-forget. Dedupes one fingerprint per document so a render loop
 * (React #185) cannot flood the Worker.
 */
export function reportClientError(error: ReportableError) {
  if (!('document' in globalThis)) return;

  const path = (window.location.pathname || '/').slice(0, 500);
  const key = fingerprint(error, path);
  if (reported.has(key)) return;
  reported.add(key);

  const message = (error.message || 'unknown').slice(0, 500).trim();
  if (!message) return;

  const payload = {
    name: (error.name || 'Error').slice(0, 200),
    message,
    digest: error.digest ?? null,
    path,
    host: window.location.host.slice(0, 253),
    stack: clip(error.stack, STACK_MAX) ?? null,
    componentStack: clip(error.componentStack, COMPONENT_STACK_MAX) ?? null,
  };

  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(CLIENT_ERROR_PATH, blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch(CLIENT_ERROR_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    // Reporting must never take down the error page.
  });
}
