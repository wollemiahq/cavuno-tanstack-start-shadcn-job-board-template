import { Link, getRouteApi } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { PublicBlogPostSummary } from "@cavuno/board";
import { formatDate } from "@cavuno/board/format";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { initialsOf } from "@/lib/initials";

const rootApi = getRouteApi("__root__");

/**
 * One crawlable blog summary. The card keeps post, tag, and every author as
 * real links so a compact archive never throws away the blog's discovery
 * graph. Long editorial labels wrap instead of being replaced by ellipses.
 */
export function PostCard({ post }: { post: PublicBlogPostSummary }) {
  const { board } = rootApi.useLoaderData();
  const date = formatDate(board.language, post.publishedAt);
  const eyebrow = post.tags[0] ?? null;
  const firstAuthor = post.authors[0] ?? null;

  return (
    <article className="group h-full">
      <Card className="h-full gap-0 py-0">
        {post.coverUrl ? (
          <Link
            to="/blog/$postSlug"
            params={{ postSlug: post.slug }}
            className="block aspect-video overflow-hidden rounded-t-[inherit]"
          >
            <img
              src={post.coverUrl}
              alt={post.featureImageAlt ?? post.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </Link>
        ) : null}

        <CardHeader className="gap-3 py-5">
          {eyebrow ? (
            <Link
              to="/blog/tag/$tagSlug"
              params={{ tagSlug: eyebrow.slug }}
              className="w-fit rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <Badge variant="secondary" className="h-auto max-w-full whitespace-normal">
                {eyebrow.name}
              </Badge>
            </Link>
          ) : null}

          <CardTitle className="text-lg leading-snug">
            <Link
              to="/blog/$postSlug"
              params={{ postSlug: post.slug }}
              className="flex items-start justify-between gap-3 rounded-sm outline-none transition-colors hover:text-primary/70 focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <span>{post.title}</span>
              <ArrowUpRight aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            </Link>
          </CardTitle>

          {post.customExcerpt ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{post.customExcerpt}</p>
          ) : null}
        </CardHeader>

        {firstAuthor || date ? (
          <CardFooter className="mt-auto gap-3 pb-5">
            {firstAuthor ? (
              <Avatar size="sm">
                {firstAuthor.avatarUrl ? (
                  <AvatarImage src={firstAuthor.avatarUrl} alt={firstAuthor.name} />
                ) : null}
                <AvatarFallback>{initialsOf(firstAuthor.name)}</AvatarFallback>
              </Avatar>
            ) : null}
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              {post.authors.length > 0 ? (
                <span className="flex flex-wrap gap-x-1 font-medium text-foreground">
                  {post.authors.map((author, index) => (
                    <span key={author.id}>
                      <Link
                        to="/blog/author/$authorSlug"
                        params={{ authorSlug: author.slug }}
                        className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                      >
                        {author.name}
                      </Link>
                      {index < post.authors.length - 1 ? "," : null}
                    </span>
                  ))}
                </span>
              ) : null}
              {date ? <span className="text-muted-foreground">{date}</span> : null}
            </div>
          </CardFooter>
        ) : (
          <CardContent className="pb-5" />
        )}
      </Card>
    </article>
  );
}
