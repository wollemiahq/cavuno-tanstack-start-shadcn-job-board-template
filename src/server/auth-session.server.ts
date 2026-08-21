import { type BoardAuthSession } from '@cavuno/board';
import { type BoardSession } from '@cavuno/board/server';
import { setResponseHeader } from '@tanstack/react-start/server';

import {
  getDataSource,
  serializeSessionForSource,
} from '../lib/data-source.server';

/**
 * Persist a returned bearer pair into the active data-source cookie.
 *
 * Lives in its own `.server.` module rather than `server/auth.ts` because it is
 * a PLAIN export: the server-fn splitter strips `createServerFn` handler bodies
 * from the client graph, but not a plain function, so exporting it from a
 * module that route files import kept `lib/data-source.server` alive in the
 * client bundle and import-protection failed the build.
 */
export function persistAuthSession(session: BoardAuthSession): BoardSession {
  const next: BoardSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
  // Write into the active data source's cookie only — never clobber the
  // other source's session when dual-source is on.
  setResponseHeader(
    'Set-Cookie',
    serializeSessionForSource(next, getDataSource()),
  );
  return next;
}
