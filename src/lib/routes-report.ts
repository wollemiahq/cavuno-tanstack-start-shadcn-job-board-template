/**
 * Preview routes-report emitter. When this board runs embedded in the
 * builder preview iframe, post the route enumeration to the parent once
 * after boot so the builder can pin path templates against the live tree.
 *
 * Fire-and-forget: never throws, never blocks render.
 */
import {
  routeEntriesFromTanStackRouteTree,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';

export const ROUTES_REPORT_TYPE = 'cavuno-builder:routes-report' as const;

/** Cap what we postMessage — large trees stay useful without ballooning the payload. */
export const ROUTES_REPORT_CAP = 500;

export type RoutesReportPayload = {
  type: typeof ROUTES_REPORT_TYPE;
  routes: string[];
};

/**
 * Map a TanStack route tree to URLPattern-style path templates
 * (`$param` → `:param`, bare `$` → `*`). Same enumeration as the
 * well-known manifest route.
 */
export function mapRouteTreeToPathTemplates(tree: TanStackRouteNode): string[] {
  return routeEntriesFromTanStackRouteTree(tree).map((entry) => entry.template);
}

type PostMessageTarget = {
  postMessage: (message: unknown, targetOrigin: string) => void;
};

/**
 * Emit the routes-report to the parent frame when embedded.
 *
 * Target origin `'*'` is acceptable — route templates are public data
 * (the same info the well-known endpoint publishes) and the PARENT
 * validates event.origin.
 */
export function emitRoutesReport(
  tree: TanStackRouteNode,
  options?: {
    /** Override for tests — defaults to `window` when defined. */
    selfWindow?: { parent: PostMessageTarget } | null;
    /** Override for tests — defaults to `window.parent` when defined. */
    parent?: PostMessageTarget | null;
  },
): void {
  try {
    const hasWindow = typeof window !== 'undefined';
    const selfWin =
      options?.selfWindow !== undefined
        ? options.selfWindow
        : hasWindow
          ? window
          : null;
    if (selfWin == null) return;

    const parent =
      options?.parent !== undefined
        ? options.parent
        : hasWindow
          ? window.parent
          : null;
    if (parent == null) return;
    // Not embedded (top-level window).
    if (parent === (selfWin as unknown)) return;

    const routes = mapRouteTreeToPathTemplates(tree).slice(
      0,
      ROUTES_REPORT_CAP,
    );
    const payload: RoutesReportPayload = {
      type: ROUTES_REPORT_TYPE,
      routes,
    };
    // Target origin '*': route templates are public data (same info the
    // well-known endpoint publishes); the PARENT validates event.origin.
    parent.postMessage(payload, '*');
  } catch {
    // Fire-and-forget: never throw into the render path.
  }
}
