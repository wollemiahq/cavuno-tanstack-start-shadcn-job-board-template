import { reportClientError } from './client-error-report';

const INSTALLED = '__cavunoClientErrorReporting';

function isIgnoredErrorEvent(event: ErrorEvent): boolean {
  const source = event.filename ?? '';
  if (
    source.startsWith('chrome-extension://') ||
    source.startsWith('moz-extension://')
  ) {
    return true;
  }
  // Cross-origin scripts surface as this opaque string; no stack to act on.
  return event.message === 'Script error.';
}

function asError(value: unknown, fallbackName: string): Error {
  if (value instanceof Error) return value;
  return Object.assign(new Error(String(value ?? 'unknown')), {
    name: fallbackName,
  });
}

/**
 * Window-level backstop for crashes that never hit a route errorComponent
 * (the talent `RangeError: Invalid time value` was one). Call once per
 * document, after first paint — listeners are free; the beacon is not.
 */
export function installClientErrorReporting() {
  if (typeof window === 'undefined') return;
  const root = window as Window & { [INSTALLED]?: boolean };
  if (root[INSTALLED]) return;
  root[INSTALLED] = true;

  window.addEventListener('error', (event) => {
    if (isIgnoredErrorEvent(event)) return;
    reportClientError(asError(event.error ?? event.message, 'Error'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(asError(event.reason, 'UnhandledRejection'));
  });
}
