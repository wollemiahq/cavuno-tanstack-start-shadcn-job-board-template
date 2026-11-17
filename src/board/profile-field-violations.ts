/**
 * The per-field refusals of a company or talent profile write. Kept apart
 * from the write helpers: the server-function module that reads these is in
 * every page's bundle, the form helpers only on the profile pages.
 */

/** One field a profile write refused, as the API details it. */
export type ProfileFieldViolation = {
  fieldKey: string;
  code: string;
  message: string;
};

/**
 * The per-field refusals of a profile write (`details.violations`, each
 * `{ fieldKey, code, message }`). Anything off that shape is dropped.
 */
export function parseProfileFieldViolations<T>(
  details: T,
): ProfileFieldViolation[] {
  // SAFETY: Board API error details are object records; every field read
  // below is re-checked before use.
  const list = (details as { violations?: unknown } | null | undefined)
    ?.violations;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry: Partial<ProfileFieldViolation> | null) =>
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- checks untrusted error details before use
    typeof entry?.fieldKey === 'string' && typeof entry.code === 'string'
      ? [
          {
            fieldKey: entry.fieldKey,
            code: entry.code,
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- checks untrusted error details before use
            message: typeof entry.message === 'string' ? entry.message : '',
          },
        ]
      : [],
  );
}
