/**
 * The header's route-owned actions slot. A route that sets
 * `staticData.ownsHeaderActions` gets an empty slot at the right of the
 * desktop header (`lg` and up) in place of the sign-in, post-a-job and
 * sign-up links (a signed-in visitor's account menu stays after it), and its
 * page fills the slot with `<HeaderRouteActions>`. Only this tiny slot lives
 * in the shared shell: whatever fills it ships in the page's own chunk.
 *
 * The page renders the actions through a portal, so they share the page's
 * state (a header button can open the page's own buying step) and appear
 * once the page has hydrated.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const HeaderRouteActionsTarget = createContext<HTMLElement | null>(null);

/** The root hands the header's slot element to the route content. */
export const HeaderRouteActionsProvider = HeaderRouteActionsTarget.Provider;

/**
 * Whether the rendered route fills the header's actions: one declaring
 * `staticData.ownsHeaderActions`, only while its own page renders (its
 * not-found and error pages keep the usual sign-in links).
 */
export function routeOwnsHeaderActions(
  matches: ReadonlyArray<{
    staticData?: { ownsHeaderActions?: boolean };
    status: string;
  }>,
): boolean {
  return matches.some(
    (match) =>
      match.staticData?.ownsHeaderActions === true &&
      match.status === 'success',
  );
}

/** Render `children` in the header's route actions slot, if there is one. */
export function HeaderRouteActions({ children }: { children: ReactNode }) {
  const target = useContext(HeaderRouteActionsTarget);
  return target ? createPortal(children, target) : null;
}
