/**
 * What a twin answers when its page's lookup misses: the board's
 * configured redirect for the URL, as the page's loader follows it, else
 * no such page. A target with a twin of its own keeps the reader on
 * Markdown.
 */
import { isBoardApiError } from '@cavuno/board';

import { localizePath } from '../../lib/localized-path';
import {
  markdownPathFor,
  resolveMarkdownTwin,
  type MarkdownTwin,
} from '../../lib/markdown-twin/routes';

import type { MarkdownTwinResult } from './result';

export type ResolveRedirect = (input: {
  data: { path: string };
}) => Promise<{ target: string | null }>;

function decodedPath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** The configured redirect for a missing page's URL, as a twin result. */
export async function managedRedirectTwin(
  twin: MarkdownTwin,
  origin: string,
  resolve: ResolveRedirect,
): Promise<MarkdownTwinResult> {
  let target: string | null;
  try {
    ({ target } = await resolve({
      data: { path: decodedPath(twin.htmlPath) },
    }));
  } catch (error) {
    // A refused lookup is not a page either way (see the catch-all loader).
    if (isBoardApiError(error) && error.status === 403) {
      return { type: 'notFound' };
    }
    throw error;
  }
  if (!target) return { type: 'notFound' };
  const targetUrl = new URL(target, origin);
  if (targetUrl.origin === new URL(origin).origin) {
    const twinUrl = new URL(markdownPathFor(targetUrl.pathname), targetUrl);
    if (resolveMarkdownTwin({ method: 'GET', url: twinUrl.href })) {
      return {
        type: 'redirect',
        location: twinUrl.pathname + targetUrl.search,
      };
    }
  }
  return { type: 'redirect', location: target };
}

/** A move to the twin of the canonical page `path`, query kept. */
export function twinRedirect(path: string, search = ''): MarkdownTwinResult {
  return {
    type: 'redirect',
    location: `${markdownPathFor(localizePath(path))}${search}`,
  };
}
