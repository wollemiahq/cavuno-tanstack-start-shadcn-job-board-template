/**
 * One structured `console.error` line per server request that failed.
 *
 * Console output is the Worker's log. Without this line an uncaught server
 * error leaves no structured trace there; browser errors already have one
 * (`starter_ouch`, src/lib/client-error-ingest.ts), and this line mirrors
 * its shape.
 *
 * A request fails on the server in one of two ways:
 *
 *  - Something throws out of the app handler (a server route such as a
 *    sitemap or feed, or the entry itself). `serveWithServerErrorLog` sees
 *    the throw, logs it, and rethrows it unchanged.
 *  - Start catches the error and answers `500` itself: a loader error
 *    rendered as the error page, a failed render, or a server-fn RPC that
 *    threw. The error object never reaches the entry, so the global
 *    function middleware (`serverErrorFunctionMiddleware`) notes the first
 *    server-fn error per request, and the entry logs it once it sees the
 *    `500`.
 *
 * Exactly one of those two branches runs per request, so a request is
 * logged at most once. Only the method, host and pathname are logged:
 * never a query string, header, cookie or body.
 */
import { isBoardApiError } from '@cavuno/board';

import { isBoardApiShed } from './board-api-shed.server';

export const STARTER_SERVER_ERROR_LOG_NAME = 'starter_server_error';

const STACK_MAX = 4000;
const MESSAGE_MAX = 500;

type StarterServerErrorLine = {
  name: typeof STARTER_SERVER_ERROR_LOG_NAME;
  source: 'board-starter';
  board: string | null;
  host: string;
  path: string;
  method: string;
  status: number | null;
  errorName: string;
  errorMessage: string;
  stack: string | null;
  preview: boolean;
  msg: string;
};

/** What the log line keeps of a thrown value. */
type ServerErrorSummary = {
  errorName: string;
  errorMessage: string;
  stack: string | null;
  /**
   * A Board API not-found, sign-in-required or load-shedding error: the
   * client turns it into the right page, so a server-fn RPC that answers
   * `500` for it has not failed.
   */
  expectedForRpc: boolean;
};

/** First server-fn error seen during each incoming request. */
const notedErrors = new WeakMap<Request, ServerErrorSummary>();

/** Error text can quote a URL; drop its query string. */
function withoutQueryStrings(text: string): string {
  return text.replace(/(\bhttps?:\/\/[^\s?#"'<>]*)\?[^\s"'<>)]*/g, '$1');
}

function clip(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = withoutQueryStrings(value).trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Parse a thrown value, at the catch that received it, into a summary. */
function summarize<T>(error: T): ServerErrorSummary {
  const expectedForRpc =
    isBoardApiError(error) && (error.status < 500 || isBoardApiShed(error));
  if (error instanceof Error) {
    return {
      errorName: clip(error.name, 200) ?? 'Error',
      errorMessage: clip(error.message, MESSAGE_MAX) ?? '',
      stack: clip(error.stack, STACK_MAX),
      expectedForRpc,
    };
  }
  return {
    errorName: 'NonError',
    errorMessage: clip(String(error), MESSAGE_MAX) ?? '',
    stack: null,
    expectedForRpc,
  };
}

/** Record `error` for `request` unless an earlier one is already noted. */
export function noteServerError<T>(error: T, request: Request): void {
  if (!notedErrors.has(request)) notedErrors.set(request, summarize(error));
}

/** A `500` answered without any server-fn error noted for the request. */
function uncaptured(status: number): ServerErrorSummary {
  return {
    errorName: 'UnknownError',
    errorMessage: `Responded ${status} without a captured error`,
    stack: null,
    expectedForRpc: false,
  };
}

export function serverErrorLine(
  request: Request,
  summary: ServerErrorSummary,
  status: number | null,
  board: string | null,
): StarterServerErrorLine {
  const url = new URL(request.url);
  const preview =
    url.hostname.startsWith('preview-') || url.hostname.startsWith('share-');
  const { errorName, errorMessage, stack } = summary;
  return {
    name: STARTER_SERVER_ERROR_LOG_NAME,
    source: 'board-starter',
    board,
    host: url.host,
    path: url.pathname,
    method: request.method,
    status,
    errorName,
    errorMessage,
    stack,
    preview,
    msg: `${STARTER_SERVER_ERROR_LOG_NAME} ${errorName}: ${errorMessage} on ${request.method} ${url.host}${url.pathname}`,
  };
}

function logServerError(
  request: Request,
  summary: ServerErrorSummary,
  status: number | null,
  board: () => string | null,
): void {
  let boardKey: string | null = null;
  try {
    boardKey = board();
  } catch {
    // A missing binding must not stop the error line itself.
  }
  console.error(
    JSON.stringify(serverErrorLine(request, summary, status, boardKey)),
  );
}

/**
 * Run `serve` for `request`, logging one `starter_server_error` line when it
 * throws (the error is rethrown unchanged) or answers `500`. The response is
 * returned as is.
 */
export async function serveWithServerErrorLog(
  request: Request,
  serve: () => Promise<Response>,
  board: () => string | null,
): Promise<Response> {
  let response: Response;
  try {
    response = await serve();
  } catch (error) {
    logServerError(request, summarize(error), null, board);
    throw error;
  }
  if (response.status === 500) {
    const noted = notedErrors.get(request);
    const isRpc = new URL(request.url).pathname.startsWith('/_serverFn');
    if (!(isRpc && noted?.expectedForRpc)) {
      logServerError(request, noted ?? uncaptured(500), 500, board);
    }
  }
  return response;
}
