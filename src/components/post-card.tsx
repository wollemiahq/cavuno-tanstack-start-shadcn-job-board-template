import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "@untitledui/icons";

import { Avatar } from "@/components/base/avatar/avatar";
import { Text } from "@/components/text";
import type { PublicBlogPostSummary } from "@cavuno/board";
import { formatDate } from "@cavuno/board/format";

/**
 * One blog post as an Untitled UI blog card (CAV-500), matching the
 * untitleduico/blog anatomy: a rounded 16:9 cover that gently zooms on
 * hover, a brand-colored category eyebrow (the post's first tag — a LINK
 * into `/blog/tag`, the SEO internal-linking spine), a bold title with a
 * trailing arrow affordance, a two-line excerpt, and an author + date row.
 * Frameless (no ring/shadow) so a grid of these reads as the UUI blog
 * index; the same component fills the article page's related-posts rail.
 */

const rootApi = getRouteApi("__root__");

/** Two-letter author initials for the avatar fallback (mirrors JobCard). */
function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0]!)
      .slice(0, 2)
      .join("")
      .toUpperCase() || undefined
  );
}

export function PostCard({ post }: { post: PublicBlogPostSummary }) {
  const { board } = rootApi.useLoaderData();
  const date = formatDate(board.language, post.publishedAt);
  const eyebrow = post.tags[0] ?? null;
  const author = post.authors[0] ?? null;
  const authorLine = post.authors.map((a) => a.name).join(", ");

  return (
    <article className="group flex h-full flex-col gap-4">
      {post.coverUrl ? (
        <Link
          to="/blog/$postSlug"
          params={{ postSlug: post.slug }}
          className="block aspect-video overflow-hidden rounded-xl ring-1 ring-secondary_alt hover:no-underline"
        >
          <img
            src={post.coverUrl}
            alt={post.featureImageAlt ?? post.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col gap-2">
        {eyebrow ? (
          <Link
            to="/blog/tag/$tagSlug"
            params={{ tagSlug: eyebrow.slug }}
            className="w-fit rounded-xs text-sm font-semibold text-brand-secondary outline-focus-ring transition-colors hover:text-brand-secondary_hover hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {eyebrow.name}
          </Link>
        ) : null}

        <Text as="h3" variant="heading4" className="leading-snug">
          <Link
            to="/blog/$postSlug"
            params={{ postSlug: post.slug }}
            className="flex items-start justify-between gap-2 rounded-xs text-primary outline-focus-ring transition-colors hover:text-brand-secondary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span>{post.title}</span>
            <ArrowUpRight
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-fg-quaternary transition-transform duration-100 ease-linear group-hover:text-brand-secondary"
            />
          </Link>
        </Text>

        {post.customExcerpt ? (
          <p className="line-clamp-2 text-sm text-tertiary">{post.customExcerpt}</p>
        ) : null}

        {author || date ? (
          <div className="mt-auto flex items-center gap-3 pt-2">
            {author ? (
              <Avatar
                size="sm"
                src={author.avatarUrl}
                initials={initialsOf(author.name)}
                alt={author.name}
              />
            ) : null}
            <div className="flex min-w-0 flex-col text-sm">
              {authorLine ? (
                <span className="truncate font-semibold text-secondary">{authorLine}</span>
              ) : null}
              {date ? <span className="text-tertiary">{date}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
