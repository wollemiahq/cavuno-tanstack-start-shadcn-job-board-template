/**
 * ads.txt — hosted-parity handler at /ads.txt. Serves the board's verbatim
 * ads.txt (or 404 when unconfigured) from board.seo().
 */
import { createFileRoute } from '@tanstack/react-router'

import { getBoard } from '../lib/board'
import { adsTxtResponse } from '../lib/seo-handlers'

export const Route = createFileRoute('/ads.txt')({
  server: {
    handlers: {
      GET: async () => adsTxtResponse(await getBoard().seo()),
    },
  },
})
