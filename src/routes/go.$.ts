/**
 * `/go/*` email indirection. Mirrors the hosted board's role-to-path
 * redirects so board emails can use stable `/go` URLs that resolve against
 * this app's route structure.
 *
 * Mounts `@cavuno/board/go` createGoHandler. No lookupJob: the
 * publishable-key Board API has no job-by-id endpoint yet, so the
 * handler's built-in degrade sends `/go/job/<id>` → 302 `/jobs`.
 *
 * Add `lookupJob` when the Board API exposes an ID lookup; until then,
 * verified job links continue to use their direct public URLs.
 */
import { createGoHandler } from '@cavuno/board/go';
import { createFileRoute } from '@tanstack/react-router';

const goHandler = createGoHandler({});

export const Route = createFileRoute('/go/$')({
  server: {
    handlers: {
      GET: ({ request }) => goHandler(request),
    },
  },
});
