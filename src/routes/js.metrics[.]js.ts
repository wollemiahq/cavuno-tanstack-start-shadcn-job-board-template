/**
 * `/js/metrics.js` — serves Tinybird's flock.js from a first-party path
 * (hosted-parity: the Next app rewrites this to the jsdelivr CDN).
 * Proxied rather than vendored so the tracker tracks upstream, with a
 * long edge cache so the CDN hop amortizes to zero.
 */
import { createFileRoute } from '@tanstack/react-router'

const FLOCK_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@tinybirdco/flock.js/dist/index.js'

export const Route = createFileRoute('/js/metrics.js')({
  server: {
    handlers: {
      GET: async () => {
        const upstream = await fetch(FLOCK_CDN_URL)
        if (!upstream.ok) {
          return new Response('// flock.js unavailable', {
            status: 502,
            headers: { 'content-type': 'application/javascript' },
          })
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'public, max-age=86400, s-maxage=86400',
          },
        })
      },
    },
  },
})
