import { CLIENT_ERROR_PATH } from "./client-error-report";

export const STARTER_OUCH_LOG_NAME = "starter_ouch";

const STACK_MAX = 4000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 1;
const rateHits = new Map<string, number[]>();

type ClientErrorBody = {
  name: string;
  message: string;
  digest?: string | null;
  path: string;
  host: string;
  stack?: string | null;
  componentStack?: string | null;
};

type StarterOuchLine = {
  name: typeof STARTER_OUCH_LOG_NAME;
  source: "board-starter";
  board: string;
  host: string;
  path: string;
  errorName: string;
  errorMessage: string;
  digest: string | null;
  stack: string | null;
  componentStack: string | null;
  preview: boolean;
  msg: string;
};

export function clientErrorIngestUrl(apiUrl: string): string {
  const url = new URL(apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
  if (url.hostname === "api.cavuno.com") {
    return "https://cavuno.com/api/board-client-error";
  }
  return `${url.origin}/api/board-client-error`;
}

function clip(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
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
  };
}

function allowRate(key: string, now = Date.now()): boolean {
  const threshold = now - RATE_WINDOW_MS;
  const recent = (rateHits.get(key) ?? []).filter((ts) => ts > threshold);
  if (recent.length >= RATE_LIMIT) {
    rateHits.set(key, recent);
    return false;
  }
  recent.push(now);
  rateHits.set(key, recent);
  return true;
}

export function resetClientErrorIngestRateLimit() {
  rateHits.clear();
}

function ouchLine(body: ClientErrorBody, board: string): StarterOuchLine {
  const preview = body.host.startsWith("preview-") || body.host.startsWith("share-");
  return {
    name: STARTER_OUCH_LOG_NAME,
    source: "board-starter",
    board,
    host: body.host,
    path: body.path,
    errorName: body.name,
    errorMessage: body.message,
    digest: body.digest ?? null,
    stack: body.stack ?? null,
    componentStack: body.componentStack ?? null,
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
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
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
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let parsed: ClientErrorBody | null = null;
  try {
    const json = await request.json();
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

  const rateKey = `${body.host}:${body.path}:${body.digest || body.message.slice(0, 80)}`;
  if (!allowRate(rateKey)) return new Response(null, { status: 204 });

  const line = ouchLine(body, env.board);
  const ingestUrl = clientErrorIngestUrl(env.apiUrl);
  const work = forwardToCavuno(ingestUrl, env.board, body).then((ok) => {
    if (!ok) console.warn(JSON.stringify(line));
  });
  if (waitUntil) waitUntil(work);
  else void work;

  return new Response(null, { status: 204 });
}
