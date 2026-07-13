/** Blog RSS — hosted-parity feed at /blog/rss.xml. */
import { createFileRoute } from '@tanstack/react-router'
import { getRequest } from '@tanstack/react-start/server'

import type { PublicBlogPostSummary } from '@cavuno/board'

import { getBoard } from '../lib/board'

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Neutralize a premature CDATA terminator so the section can't be broken out of. */
function sanitizeCdata(value: string): string {
  return value.replaceAll(']]>', ']]&gt;')
}

function rssDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? d.toUTCString() : ''
}

/** Canonical-aware post URL (mirrors the hosted feed's `resolvePostUrl`). */
function postUrl(post: PublicBlogPostSummary, origin: string): string {
  const canonical = post.canonicalUrl?.trim()
  if (canonical) {
    if (canonical.startsWith('http://') || canonical.startsWith('https://')) {
      return canonical
    }
    if (canonical.startsWith('/')) return `${origin}${canonical}`
  }
  return `${origin}/blog/${post.slug}`
}

/** Description with the hosted fallback chain: excerpt → "title - authors" → title. */
function description(post: PublicBlogPostSummary): string {
  if (post.customExcerpt) return sanitizeCdata(post.customExcerpt)
  const authors = post.authors.map((a) => a.name).join(', ')
  return sanitizeCdata(authors ? `${post.title} - ${authors}` : post.title)
}

export const Route = createFileRoute('/blog/rss.xml')({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(getRequest().url).origin
        const board = getBoard()
        const [context, posts] = await Promise.all([
          board.context(),
          board.blog.posts.list({ limit: 50 }),
        ])

        const latest = posts.data
          .map((p) => p.publishedAt)
          .filter((d): d is string => Boolean(d))
          .sort()
          .at(-1)
        const lastBuildDate = rssDate(latest ?? null) || new Date(0).toUTCString()

        const items = posts.data
          .map((post) => {
            const url = postUrl(post, origin)
            const pubDate = rssDate(post.publishedAt)
            const categories = post.tags
              .map((tag) => `<category>${xmlEscape(tag.name)}</category>`)
              .join('')
            return (
              `<item>` +
              `<title>${xmlEscape(post.title)}</title>` +
              `<link>${xmlEscape(url)}</link>` +
              `<guid isPermaLink="true">${xmlEscape(url)}</guid>` +
              (pubDate ? `<pubDate>${pubDate}</pubDate>` : '') +
              `<description><![CDATA[${description(post)}]]></description>` +
              categories +
              `</item>`
            )
          })
          .join('')

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>` +
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
          `<channel>` +
          `<title>${xmlEscape(`${context.name} Blog`)}</title>` +
          `<link>${xmlEscape(`${origin}/blog`)}</link>` +
          `<description>${xmlEscape(`Latest posts from ${context.name}.`)}</description>` +
          `<lastBuildDate>${lastBuildDate}</lastBuildDate>` +
          `<atom:link href="${xmlEscape(`${origin}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />` +
          items +
          `</channel>` +
          `</rss>`

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
