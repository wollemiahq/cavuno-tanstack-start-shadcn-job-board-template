/**
 * Cross-request memo that holds SETTLED values only. Every per-isolate cache
 * in this app goes through it.
 *
 * On Cloudflare Workers, I/O belongs to the request that started it. When
 * that request is cancelled (a client disconnects, which crawlers do all the
 * time), its in-flight fetches are cancelled too, and any promise built on
 * them never settles. A module-scope cache that stores such a pending promise
 * hands it to every later request in the isolate, and each of them hangs
 * until its own client gives up (2026-10-02: a single-flight entry stayed
 * pending 91s+ for a 4s fetch, and every later request in that isolate hung).
 *
 * So this cache never stores a promise, Response, or stream. A caller awaits
 * its OWN read and only then calls `set`. A failed read is never stored: the
 * caller simply does not call `set`. The price is that concurrent misses in
 * one isolate each do their own fetch; no request ever waits on I/O another
 * request owns.
 */

export interface SettledCacheOptions {
  /** How long a value stays fresh. `Infinity` keeps it until cleared. */
  ttlMs: number;
  now?: () => number;
  /** Oldest entries are dropped past this size. Use when keys can grow. */
  maxEntries?: number;
}

export interface SettledCache<Key, Value> {
  /** The value if it is still within the TTL, else `undefined`. */
  get(key: Key): Value | undefined;
  /** The last stored value regardless of age, else `undefined`. */
  getStale(key: Key): Value | undefined;
  /**
   * Store a settled value. `readAt` is when the caller STARTED the read that
   * produced it (defaults to now); a value from an older read never replaces
   * one from a newer read, so a slow stale fetch cannot undo a fresh one.
   */
  set(key: Key, value: Value, readAt?: number): void;
  delete(key: Key): void;
  clear(): void;
}

export function createSettledCache<Key, Value>(
  options: SettledCacheOptions,
): SettledCache<Key, Value> {
  const { ttlMs, maxEntries } = options;
  const now = options.now ?? Date.now;
  const entries = new Map<Key, { at: number; value: Value }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry || now() - entry.at >= ttlMs) return undefined;
      return entry.value;
    },
    getStale(key) {
      return entries.get(key)?.value;
    },
    set(key, value, readAt = now()) {
      if (
        value instanceof Promise ||
        value instanceof Response ||
        value instanceof ReadableStream
      ) {
        throw new TypeError(
          'settled-cache stores settled values only; await the read first',
        );
      }
      const previous = entries.get(key);
      if (previous && previous.at > readAt) return;
      entries.delete(key);
      entries.set(key, { at: readAt, value });
      if (maxEntries !== undefined) {
        for (const oldest of entries.keys()) {
          if (entries.size <= maxEntries) break;
          entries.delete(oldest);
        }
      }
    },
    delete(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
  };
}
