import { Link, getRouteApi } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

import { toBlogPostCardVM } from '@/board/blog-view-model';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initialsOf } from '@/lib/initials';
import type { PublicBlogPostSummary } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

/**
 * One crawlable blog summary. The card keeps post, tag, and every author as
 * real links so a compact archive never throws away the blog's discovery
 * graph. Long editorial labels wrap instead of being replaced by ellipses.
 */
export function PostCard({ post }: { post: PublicBlogPostSummary }) {
  const { board } = rootApi.useLoaderData();
  const date = toBlogPostCardVM(post, board.language).publishedAtLabel;
  const eyebrow = post.tags[0] ?? null;
  const firstAuthor = post.authors[0] ?? null;

  return (
    <article className="group h-full">
      <Card className="relative h-full has-[>a:first-child]:pt-0">
        {post.coverUrl ? (
          <Link
            to="/blog/$postSlug"
            params={{ postSlug: post.slug }}
            className="relative z-10 block aspect-video overflow-hidden rounded-t-[inherit]"
          >
            <img
              src={post.coverUrl}
              alt={post.featureImageAlt ?? post.title}
              width={1200}
              height={675}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
              loading="lazy"
            />
          </Link>
        ) : null}

        <CardHeader className="gap-3">
          {eyebrow ? (
            <Link
              to="/blog/tag/$tagSlug"
              params={{ tagSlug: eyebrow.slug }}
              className="focus-visible:ring-ring/50 relative z-10 w-fit rounded-2xl outline-none focus-visible:ring-2"
            >
              <Badge
                variant="secondary"
                className="h-auto max-w-full whitespace-normal"
              >
                {eyebrow.name}
              </Badge>
            </Link>
          ) : null}

          <CardTitle className="text-lg leading-snug">
            <Link
              to="/blog/$postSlug"
              params={{ postSlug: post.slug }}
              className="hover:text-primary/70 focus-visible:ring-ring/50 flex items-start justify-between gap-3 rounded-sm transition-colors outline-none after:absolute after:inset-0 after:z-(--z-card-overlay) after:rounded-[inherit] focus-visible:ring-2"
            >
              <span dir="auto">{post.title}</span>
              <ArrowUpRight
                aria-hidden
                className="text-muted-foreground mt-0.5 size-5 shrink-0 rtl:-scale-x-100"
              />
            </Link>
          </CardTitle>

          {post.customExcerpt ? (
            <p
              className="text-muted-foreground line-clamp-2 text-sm"
              dir="auto"
            >
              {post.customExcerpt}
            </p>
          ) : null}
        </CardHeader>

        {firstAuthor || date ? (
          <CardContent className="mt-auto flex items-center gap-3">
            {firstAuthor ? (
              <Avatar size="sm">
                {firstAuthor.avatarUrl ? (
                  <AvatarImage
                    src={firstAuthor.avatarUrl}
                    alt={firstAuthor.name}
                  />
                ) : null}
                <AvatarFallback>{initialsOf(firstAuthor.name)}</AvatarFallback>
              </Avatar>
            ) : null}
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              {post.authors.length > 0 ? (
                <span className="text-foreground flex flex-wrap gap-x-1 font-medium">
                  {post.authors.map((author, index) => (
                    <span key={author.id}>
                      <Link
                        to="/blog/author/$authorSlug"
                        params={{ authorSlug: author.slug }}
                        className="focus-visible:ring-ring/50 relative z-10 rounded-sm outline-none hover:underline focus-visible:ring-2"
                      >
                        {author.name}
                      </Link>
                      {index < post.authors.length - 1 ? ',' : null}
                    </span>
                  ))}
                </span>
              ) : null}
              {date ? (
                <span className="text-muted-foreground">{date}</span>
              ) : null}
            </div>
          </CardContent>
        ) : null}
      </Card>
    </article>
  );
}
