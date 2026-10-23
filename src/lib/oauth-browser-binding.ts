export const OAUTH_BROWSER_BINDING_PARAM = 'cavuno_oauth_binding';
const COOKIE = '__Host-cavuno-oauth-browser';

export function oauthBrowserCookie(binding: string) {
  return `${COOKIE}=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${binding ? 600 : 0}`;
}

export function matchesOAuthBrowser(
  cookie: string | null | undefined,
  binding: string | undefined,
): boolean {
  if (!binding) return false;
  const value = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return value === binding;
}
