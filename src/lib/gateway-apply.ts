import { isTrustedApplyGatewayUrl } from './apply-gateway-url';

const APPLY_LOCATION_UNAVAILABLE = 'APPLY_LOCATION_UNAVAILABLE';

export type GatewayApplyResult =
  | { kind: 'location-denied' }
  | { kind: 'redirect'; redirectUrl: string };

/** Navigate without disclosing the board URL to the external employer. */
export function navigateToExternalApply(
  redirectUrl: string,
  activate: (link: HTMLAnchorElement) => void = (link) => link.click(),
): void {
  if (!safeExternalUrl(redirectUrl)) throw new Error('Invalid Apply URL');
  const link = document.createElement('a');
  link.href = redirectUrl;
  link.target = '_self';
  link.rel = 'noreferrer';
  link.referrerPolicy = 'no-referrer';
  link.hidden = true;
  document.body.appendChild(link);
  try {
    activate(link);
  } finally {
    link.remove();
  }
}

/**
 * Complete the board-local, click-time handoff for a gateway Apply.
 *
 * The form remains the no-JavaScript fallback. Enhanced clients ask for JSON
 * then asks Cavuno's user-edge gateway for the canonical decision. A known
 * denial becomes local UI; an allowed response navigates to the employer.
 */
export async function requestGatewayApply(
  form: HTMLFormElement,
  fetchApply: typeof fetch = fetch,
): Promise<GatewayApplyResult> {
  const response = await fetchApply(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  const body = await jsonBody(response);
  if (!response.ok) {
    throw new Error('Apply handoff failed');
  }
  if (safeExternalUrl(body?.redirectUrl)) {
    return { kind: 'redirect', redirectUrl: body.redirectUrl };
  }
  const gatewayUrl = trustedGatewayUrl(body?.gatewayUrl);
  if (!gatewayUrl) throw new Error('Apply handoff failed');

  const gatewayResponse = await fetchApply(gatewayUrl.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'omit',
    mode: 'cors',
    redirect: 'error',
  });
  const gatewayBody = await jsonBody(gatewayResponse);
  if (
    gatewayResponse.status === 403 &&
    gatewayBody?.code === APPLY_LOCATION_UNAVAILABLE
  ) {
    return { kind: 'location-denied' };
  }
  if (!gatewayResponse.ok || !safeExternalUrl(gatewayBody?.redirectUrl)) {
    throw new Error('Apply gateway failed');
  }
  return { kind: 'redirect', redirectUrl: gatewayBody.redirectUrl };
}

async function jsonBody(response: Response) {
  // SAFETY: The body stays untrusted; every consumed field is checked against
  // an exact sentinel or parsed as a bounded HTTPS URL before use.
  return (await response.json().catch(() => null)) as {
    code?: string;
    gatewayUrl?: string;
    redirectUrl?: string;
  } | null;
}

function safeExternalUrl(value: string | null | undefined): value is string {
  if (!value || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' && url.username === '' && url.password === ''
    );
  } catch {
    return false;
  }
}

function trustedGatewayUrl(value: string | null | undefined): URL | null {
  if (!value || value.length > 500) return null;
  try {
    const url = new URL(value);
    const opaque = url.pathname.startsWith('/a/')
      ? url.pathname.slice('/a/'.length)
      : '';
    return /^[A-Za-z0-9_-]{16,128}$/.test(opaque) &&
      isTrustedApplyGatewayUrl(url, 'a', opaque)
      ? url
      : null;
  } catch {
    return null;
  }
}
