const PRODUCTION_GATEWAY_HOST = 'apply.cavuno.com';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Production stays host-locked; local HTTP(S) exists only for dev smoke. */
export function isTrustedApplyGatewayUrl(
  url: URL,
  pathKind: 'a' | 'r',
  opaque: string,
): boolean {
  const production =
    url.protocol === 'https:' &&
    url.hostname === PRODUCTION_GATEWAY_HOST &&
    url.port === '';
  const local =
    import.meta.env.DEV &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    isLocalHost(url.hostname);
  return (
    (production || local) &&
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === '' &&
    url.pathname === `/${pathKind}/${opaque}`
  );
}
