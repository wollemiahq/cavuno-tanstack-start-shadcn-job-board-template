import {
  CLIENT_ERROR_KINDS,
  CLIENT_ERROR_PATH,
  type ClientErrorKind,
} from './client-error-report';
import { searchString } from './pagination';

export const STARTER_OUCH_LOG_NAME = 'starter_ouch';

const STACK_MAX = 4000;
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_KEYS = 1024;
const MAX_REPORT_BYTES = 16_384;
const rateHits = new Map<string, { count: number; expires: number }>();

type ClientErrorBody = {
  name: string;
  message: string;
  digest?: string | null;
  path: string;
  host: string;
  stack?: string | null;
  componentStack?: string | null;
  kind?: ClientErrorKind | null;
};

type StarterOuchLine = {
  name: typeof STARTER_OUCH_LOG_NAME;
  source: 'board-starter';
  board: string;
  host: string;
  path: string;
  errorName: string;
  errorMessage: string;
  digest: string | null;
  stack: string | null;
  componentStack: string | null;
  kind: ClientErrorKind | null;
  preview: boolean;
  msg: string;
};

export function clientErrorIngestUrl(apiUrl: string): string {
  const url = new URL(apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  if (url.hostname === 'api.cavuno.com') {
    return 'https://cavuno.com/api/board-client-error';
  }
  return `${url.origin}/api/board-client-error`;
}

function clip<T>(value: T, max: number): string | null {
  const trimmed = searchString(value)?.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function parseKind(value: string | null | undefined): ClientErrorKind | null {
  return CLIENT_ERROR_KINDS.find((kind) => kind === value) ?? null;
}

function parseBody(record: ClientErrorBody): ClientErrorBody | null {
  const name = clip(record.name, 200);
  const message = clip(record.message, 500);
  const path = clip(record.path, 500);
  const host = clip(record.host, 253);
  if (!name || !message || !path || !host) return null;
  return {
    name,
    message,
    path,
    host,
    digest: clip(record.digest, 100),
    stack: clip(record.stack, STACK_MAX),
    componentStack: clip(record.componentStack, STACK_MAX),
    kind: parseKind(record.kind),
  };
}

function allowRate(key: string, limit: number, now = Date.now()): boolean {
  for (const [storedKey, entry] of rateHits) {
    if (entry.expires <= now) rateHits.delete(storedKey);
  }
  const entry = rateHits.get(key);
  if (entry) {
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }
  if (rateHits.size >= MAX_RATE_KEYS) return false;
  rateHits.set(key, { count: 1, expires: now + RATE_WINDOW_MS });
  return true;
}

async function readReport(request: Request): Promise<ClientErrorBody | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REPORT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function resetClientErrorIngestRateLimit() {
  rateHits.clear();
}

function ouchLine(body: ClientErrorBody, board: string): StarterOuchLine {
  const preview =
    body.host.startsWith('preview-') || body.host.startsWith('share-');
  return {
    name: STARTER_OUCH_LOG_NAME,
    source: 'board-starter',
    board,
    host: body.host,
    path: body.path,
    errorName: body.name,
    errorMessage: body.message,
    digest: body.digest ?? null,
    stack: body.stack ?? null,
    componentStack: body.componentStack ?? null,
    kind: body.kind ?? null,
    preview,
    msg: `${STARTER_OUCH_LOG_NAME} ${body.name}: ${body.message} on ${body.host}${body.path}`,
  };
}

async function forwardToCavuno(
  ingestUrl: string,
  board: string,
  body: ClientErrorBody,
): Promise<boolean> {
  try {
    const response = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        publishableKey: board,
        ...body,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Same-origin ingest. Returns null for every other path so `server.ts`
 * can fall through to the app. Forwards to the platform ingest off the
 * request (waitUntil); console.warns only when that forward fails so
 * Cloudflare still has the event before Logpush/Hetzner catch up.
 */
export async function matchClientErrorIngest(
  request: Request,
  env: { apiUrl: string; board: string },
  waitUntil?: (promise: Promise<void>) => void,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== CLIENT_ERROR_PATH && path !== `${CLIENT_ERROR_PATH}/`) {
    return null;
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const origin = request.headers.get('origin');
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return new Response(null, { status: 204 });
  }
  // Content fingerprints are useful for deduplication, but cannot identify
  // clients: each report can choose a new digest. The aggregate bucket also
  // bounds forwarding across clients, and all retained buckets expire.
  if (
    !allowRate(`board:${env.board}`, 60) ||
    !allowRate(
      `client:${env.board}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`,
      10,
    )
  ) {
    return new Response(null, { status: 204 });
  }

  let parsed: ClientErrorBody | null = null;
  try {
    const json = await readReport(request);
    if (json !== null && Object(json) === json) {
      // SAFETY: POST JSON is a ClientErrorBody; missing or empty required
      // fields fail the clip checks below and are dropped.
      parsed = json as ClientErrorBody;
    }
  } catch {
    return new Response(null, { status: 204 });
  }

  const body = parsed ? parseBody(parsed) : null;
  if (!body) return new Response(null, { status: 204 });

  const rateKey = `${body.kind ?? 'crash'}:${body.host}:${body.path}:${body.digest || body.message.slice(0, 80)}`;
  if (!allowRate(`report:${env.board}:${rateKey}`, 1))
    return new Response(null, { status: 204 });

  const line = ouchLine(body, env.board);
  const ingestUrl = clientErrorIngestUrl(env.apiUrl);
  const work = forwardToCavuno(ingestUrl, env.board, body).then((ok) => {
    if (!ok) console.warn(JSON.stringify(line));
  });
  if (waitUntil) waitUntil(work);
  else void work;

  return new Response(null, { status: 204 });
}
