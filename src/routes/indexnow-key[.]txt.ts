/**
 * indexnow-key.txt — hosted-parity handler at /indexnow-key.txt. Serves the
 * board's IndexNow key (or 404 when unconfigured) from board.seo().
 */
import { createFileRoute } from '@tanstack/react-router'

import { getBoard } from '../lib/board'
import { indexNowResponse } from '../lib/seo-handlers'

export const Route = createFileRoute('/indexnow-key.txt')({
  server: {
    handlers: {
      GET: async () => indexNowResponse(await getBoard().seo()),
    },
  },
})
