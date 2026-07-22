/**
 * `/go/*` — LNK-04 email indirection. Mirrors the hosted board's role →
 * path redirects so builder-board emails can use stable /go URLs that
 * resolve against this app's route structure.
 *
 * Mounts `@cavuno/board/go` createGoHandler. No lookupJob: the
 * publishable-key Board API has no job-by-id endpoint yet, so the
 * handler's built-in degrade sends `/go/job/<id>` → 302 `/jobs`.
 *
 * TODO(LNK-04-followup): wire lookupJob when the Board API grows an id
 * lookup — REQUIRED before goVerified flips builder-board emails to /go.
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
