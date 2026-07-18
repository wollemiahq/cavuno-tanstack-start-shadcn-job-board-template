import { Link } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';
import type { PublicBlogTag } from '@cavuno/board';

export interface BlogTagChipsProps {
  /** Tag list from the blog loader — the same source the index reads. */
  tags: PublicBlogTag[];
  /** Slug of the tag whose archive is being viewed; `null` on the index. */
  activeTagSlug?: string | null;
  /** Marks the "All" chip active — true on the index when not searching. */
  allActive?: boolean;
}

/**
 * The blog's topic row: an "All" chip back to the index plus one anchor per
 * tag. Shared by the index and every tag archive so each tag page interlinks
 * every other tag, with the current tag in the index's active treatment.
 */
export function BlogTagChips({
  tags,
  activeTagSlug = null,
  allActive = false,
}: BlogTagChipsProps) {
  return (
    <nav aria-label={m.blogIndex_topicsLabel()} className="flex flex-wrap gap-2">
      <Link
        to="/blog"
        search={{}}
        aria-current={allActive ? 'page' : undefined}
        className="focus-visible:ring-ring/30 rounded-2xl outline-none focus-visible:ring-3"
      >
        <Badge variant={allActive ? 'default' : 'secondary'}>
          {m.blogIndex_allTagsLabel()}
        </Badge>
      </Link>
      {tags.map((tag) => {
        const active = tag.slug === activeTagSlug;
        return (
          <Link
            key={tag.id}
            to="/blog/tag/$tagSlug"
            params={{ tagSlug: tag.slug }}
            aria-current={active ? 'page' : undefined}
            className="focus-visible:ring-ring/30 rounded-2xl outline-none focus-visible:ring-3"
          >
            <Badge
              variant={active ? 'default' : 'secondary'}
              className="h-auto max-w-full whitespace-normal"
            >
              {tag.name}
            </Badge>
          </Link>
        );
      })}
    </nav>
  );
}
