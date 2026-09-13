export type TextValues = Readonly<
  Record<string, string | number | null | undefined>
>;

/** Substitute only supplied values. Missing tokens discard the whole field. */
export function resolveText(
  template: string | null | undefined,
  values: TextValues,
  fallback: string,
): string {
  if (template == null) return fallback;
  if (template.includes('{{{') || template.includes('}}}')) return fallback;
  let unresolved = false;
  const result = template.replace(/{{([^{}]*)}}/g, (_, raw: string) => {
    const key = raw.trim();
    const value = Object.prototype.hasOwnProperty.call(values, key)
      ? values[key]
      : undefined;
    if (
      !/^[a-zA-Z0-9_]+$/.test(key) ||
      value == null ||
      // Numbers and text are both intentional inputs; reject non-finite numbers before interpolation.
      // oxlint-disable-next-line anti-slop/no-runtime-typeof
      (typeof value === 'number' && !Number.isFinite(value)) ||
      String(value).trim() === ''
    ) {
      unresolved = true;
      return '';
    }
    return String(value);
  });
  // Malformed placeholders and token-shaped values must not leak into copy.
  return unresolved || result.includes('{{') || result.includes('}}')
    ? fallback
    : result;
}
