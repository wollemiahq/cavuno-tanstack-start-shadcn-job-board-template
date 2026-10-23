import { currentPathFromReferer } from '@cavuno/board/server';

/** Page renders own their URL; an RPC carries the page in its Referer. */
export function boardAccessPath(requestUrl: string, referer: string | null) {
  try {
    const request = new URL(requestUrl);
    if (!request.pathname.startsWith('/_serverFn/')) {
      return currentPathFromReferer(requestUrl);
    }
  } catch {
    // A missing page URL still leaves the guarded RPC Referer as a fallback.
  }
  return currentPathFromReferer(referer);
}
