/**
 * Renders JSON-LD structured data as `<script type="application/ld+json">` in
 * the document. Rendered in the component body (not TanStack `head`, whose
 * `scripts` don't emit inline JSON-LD here).
 *
 * The payload is API-derived (job titles, slugs, names), so every `<` is escaped
 * to `<` before injection — the standard JSON-LD hardening that prevents a
 * `</script>` in any string from breaking out of the tag (XSS). JSON-LD parsers
 * read the `<` escape transparently.
 */
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
