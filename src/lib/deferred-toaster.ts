/**
 * The root mounts sonner's `<Toaster>` lazily, on the visitor's first pointer
 * or key press, to keep it out of the first paint. A toast raised as a page
 * loads (the "You've joined" greeting after an invite) comes before any
 * press, so it asks for the Toaster here; otherwise it would sit unseen until
 * the visitor's first click.
 */
let requested = false;
const listeners = new Set<() => void>();

/** Ask the root to mount the Toaster now. */
export function requestToaster(): void {
  if (requested) return;
  requested = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

/**
 * Run `listener` once the Toaster is requested — straight away when it
 * already was. Returns an unsubscribe.
 */
export function onToasterRequested(listener: () => void): () => void {
  if (requested) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
