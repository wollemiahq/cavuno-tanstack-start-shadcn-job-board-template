import { safeRedirectPath as sdkSafeRedirectPath } from '@cavuno/board/server';

/** Validate the path again after WHATWG URL dot-segment normalization. */
export function safeRedirectPath(
  value: string | undefined,
  fallback = '/',
): string {
  const path = sdkSafeRedirectPath(value, fallback);
  const normalized = new URL(path, 'https://board.invalid');
  if (
    normalized.origin !== 'https://board.invalid' ||
    normalized.pathname.startsWith('//')
  )
    return fallback;
  return `${normalized.pathname}${normalized.search}${normalized.hash}`;
}
