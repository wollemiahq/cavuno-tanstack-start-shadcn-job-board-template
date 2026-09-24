/**
 * Candidate handle rules: the public profile address a candidate chooses in
 * the account profile form. They mirror the hosted board's candidate profile
 * form; the Board API only checks per-board uniqueness, so this is the one
 * place the format is enforced.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 50;

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/** Why a handle cannot be saved, or `null` when it is well formed. */
export type HandleProblem = 'required' | 'length' | 'format';

export function handleProblem(handle: string): HandleProblem | null {
  if (!handle) return 'required';
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    return 'length';
  }
  return HANDLE_PATTERN.test(handle) ? null : 'format';
}

/** What typing into the handle field keeps: lower case, hyphens for spaces. */
export function normalizeHandleInput(value: string): string {
  return value.toLowerCase().replace(/\s/g, '-');
}

/**
 * A handle suggested from a display name (the hosted `slugifyName`): lower
 * case, only a-z, 0-9 and single hyphens, no hyphen at either end. Cut to
 * the maximum length so a long name still suggests a usable handle.
 */
export function handleFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/^-|-$/g, '');
}

/** The handle a profile without one starts from: the name's, if long enough. */
export function suggestedHandle(name: string): string {
  const handle = handleFromName(name);
  return handle.length < HANDLE_MIN_LENGTH ? '' : handle;
}
