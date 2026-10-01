/**
 * Memo scoped to ONE incoming request.
 *
 * Entries live in a WeakMap keyed on the incoming `Request`, so only work
 * inside that request can see them, and they are collected with it. That is
 * what makes it safe to hold an in-flight promise here: every caller is in the
 * request that started the I/O, so a cancelled request only strands its own
 * callers. Nothing is shared across requests; use src/lib/settled-cache.ts
 * for that.
 *
 * During SSR, every server function a document render calls runs in-process
 * under the same request, so `getRequest()` returns the same object for all of
 * them. A client-side server function call is its own HTTP request with its
 * own scope.
 */
export interface RequestMemo<Value> {
  /** The value memoised for `key` in this request, if any. */
  get(scope: Request, key: string): Value | undefined;
  /** The value memoised for `key` in this request, creating it once. */
  getOrCreate(scope: Request, key: string, create: () => Value): Value;
}

/** `Value` is an object (never `undefined`), so a miss reads as `undefined`. */
export function createRequestMemo<Value extends object>(): RequestMemo<Value> {
  const byRequest = new WeakMap<Request, Map<string, Value>>();

  return {
    get(scope, key) {
      return byRequest.get(scope)?.get(key);
    },
    getOrCreate(scope, key, create) {
      let entries = byRequest.get(scope);
      if (!entries) {
        entries = new Map();
        byRequest.set(scope, entries);
      }
      const existing = entries.get(key);
      if (existing !== undefined) return existing;
      const value = create();
      entries.set(key, value);
      return value;
    },
  };
}
