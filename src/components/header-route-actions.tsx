/**
 * The header's route-owned actions slot. A route that sets
 * `staticData.ownsHeaderActions` gets a slot at the right of the desktop
 * header (`lg` and up), and its page fills it with `<HeaderRouteActions>`.
 * While the slot is filled, the sign-in, post-a-job and sign-up links give
 * way to it (a signed-in visitor's account menu stays after it); whenever the
 * page does not fill it (its checkout step, an error page) the usual links
 * stay. Only this tiny slot lives in the shared shell: whatever fills it ships
 * in the page's own chunk.
 *
 * The page renders the actions through a portal, so they share the page's
 * state (a header button can open the page's own buying step) and appear
 * once the page has hydrated.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type HeaderRouteActionsSlot = {
  /** The header's slot element; null while the route does not own one. */
  target: HTMLElement | null;
  /** Told when a page starts and stops filling the slot. */
  onFilledChange: (filled: boolean) => void;
};

const HeaderRouteActionsContext = createContext<HeaderRouteActionsSlot | null>(
  null,
);

/** The root hands the header's slot to the route content. */
export const HeaderRouteActionsProvider = HeaderRouteActionsContext.Provider;

/**
 * Whether the rendered route has a header actions slot: one declaring
 * `staticData.ownsHeaderActions`, only while its own page renders (its
 * not-found page keeps the usual header).
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
  const slot = useContext(HeaderRouteActionsContext);
  const target = slot?.target ?? null;
  const onFilledChange = slot?.onFilledChange;
  useEffect(() => {
    if (!target || !onFilledChange) return;
    onFilledChange(true);
    return () => onFilledChange(false);
  }, [target, onFilledChange]);
  return target ? createPortal(children, target) : null;
}
