/**
 * Runtime board feature flags (Board PR #968) that `@cavuno/board@1.38.0`
 * carries on the board CONTEXT at RUNTIME but does not yet TYPE on the
 * public board-context shape. Resolve them ONCE, at the single server
 * boundary that reads the context (`getBoardContext` in
 * `src/server/queries.ts`), and hand components clean typed booleans — so no
 * `as` cast leaks into presentation.
 *
 * Polarity is additive / default-ON, mirroring the platform's enforcement:
 * a flag ABSENT from an older API deployment ⇒ the feature is ON.
 *
 *  - `nativeApplications === false` ⇒ external-applications-only: native
 *    apply is 422'd and applicant / pipeline reads 404 / are disabled.
 *  - `messaging === false` ⇒ the whole applicant↔employer messaging surface
 *    is off.
 *
 * TODO(sdk-release): drop the boundary cast below once `@cavuno/board` types
 * `features.nativeApplications` / `features.messaging` on the board context.
 */
import type { BoardSdk } from '@cavuno/board';

type BoardContextFeatures = Awaited<
  ReturnType<BoardSdk['context']>
>['features'];

export interface RuntimeBoardFeatureFlags {
  /** false ⇒ external-applications-only (no native apply / applications). */
  nativeApplications: boolean;
  /** false ⇒ the applicant↔employer messaging surface is off. */
  messaging: boolean;
}

/**
 * Read the two runtime flags off the context's `features` group, narrowing
 * once here at the boundary. Absent ⇒ `true` (default-on).
 */
export function resolveRuntimeFeatureFlags(
  features: BoardContextFeatures,
): RuntimeBoardFeatureFlags {
  const parity = features as BoardContextFeatures & {
    nativeApplications?: boolean;
    messaging?: boolean;
  };
  return {
    nativeApplications: parity.nativeApplications ?? true,
    messaging: parity.messaging ?? true,
  };
}
