/**
 * JSON-LD structured data emission.
 *
 * Routes whose loader carries a precomputed `jsonLd` payload MUST emit it via
 * route `head()` `scripts` using `jsonLdHeadScripts` — React 19 streaming SSR
 * only reliably flushes body-rendered `<script>` elements when they land
 * inside an already-flushed Suspense segment, so a body `<JsonLd>` can
 * silently vanish from the served HTML depending on boundary layout (verified
 * 2026-08-03 on /blog vs /jobs). Head scripts always reach the document.
 *
 * The body-rendered `<JsonLd>` component remains only for payloads computed
 * inside components; fold those into their page server functions when touched.
 *
 * The payload is API-derived (job titles, slugs, names), so every `<` is escaped
 * to `<` before injection — the standard JSON-LD hardening that prevents a
 * `</script>` in any string from breaking out of the tag (XSS). JSON-LD parsers
 * read the escape transparently.
 */

/** Route-`head()` `scripts` entries for a precomputed JSON-LD payload. */
export function jsonLdHeadScripts(
  data: readonly unknown[] | undefined,
): Array<{ type: string; children: string }> {
  return (data ?? []).map((object) => ({
    type: 'application/ld+json',
    children: JSON.stringify(object).replace(/</g, '\\u003c'),
  }));
}

export function JsonLd({ data }: { data: unknown[] }) {
  return (
    <>
      {data.map((object, index) => (
        <script
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(object).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
