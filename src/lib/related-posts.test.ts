import { describe, expect, it } from 'vitest'

import { selectRelatedPosts } from './related-posts'

/**
 * Related-posts selection (CAV-500). The article page shows posts related
 * to the one being read: those sharing its first tag come first, latest
 * posts fill any remainder, the current post is never in its own related
 * rail, and a post surfaced by both sources appears once. These lock the
 * WHY (a relevant, current-post-excluded, deduped, capped rail), not the
 * data plumbing.
 */
const post = (id: string) => ({ id, slug: `p-${id}`, title: id })

describe('selectRelatedPosts', () => {
  it('prefers tag-sharing posts, excludes the current post, and caps at the limit', () => {
    const result = selectRelatedPosts({
      currentId: 'self',
      byTag: [post('self'), post('a'), post('b'), post('c'), post('d')],
      latest: [post('x')],
      limit: 3,
    })
    expect(result.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('falls back to latest posts when too few share the tag', () => {
    const result = selectRelatedPosts({
      currentId: 'self',
      byTag: [post('a')],
      latest: [post('self'), post('m'), post('n')],
      limit: 3,
    })
    expect(result.map((p) => p.id)).toEqual(['a', 'm', 'n'])
  })

  it('does not repeat a post that appears in both the tag and latest lists', () => {
    const result = selectRelatedPosts({
      currentId: 'self',
      byTag: [post('a')],
      latest: [post('a'), post('b')],
      limit: 3,
    })
    expect(result.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('returns nothing when the current post is the only candidate', () => {
    const result = selectRelatedPosts({
      currentId: 'self',
      byTag: [post('self')],
      latest: [post('self')],
      limit: 3,
    })
    expect(result).toEqual([])
  })
})
