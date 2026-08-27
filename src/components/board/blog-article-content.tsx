import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';
import { FileWarning } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { toBlogArticleVM } from '@/board/blog-view-model';
import { BoardAdSlot } from '@/components/board/board-ad-slot';
import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { FacebookIcon, LinkedInIcon, XIcon } from '@/components/brand-icons';
import {
  Page,
  PageContent,
  PageHeader,
  PageSection,
} from '@/components/layout/page';
import { PostCard } from '@/components/post-card';
import { Prose } from '@/components/prose';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import {
  extractToc,
  withHeadingAnchors,
  type TocEntry,
} from '@/lib/article-toc';
import type { BoardAdsConfig } from '@/lib/board-ads';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { initialsOf } from '@/lib/initials';
import { localizePath } from '@/lib/localized-path';
import { cn } from '@/lib/utils';
import type {
  PublicBlogAdjacentPosts,
  PublicBlogPost,
  PublicBlogPostSummary,
} from '@cavuno/board';

export interface BlogArticleMissingBodyState {
  title: string;
  description: string;
  action: { label: string; href: string };
}

export interface BlogArticleContentProps {
  breadcrumb: BreadcrumbData;
  post: PublicBlogPost;
  language: string;
  permalink: string;
  missingBody: BlogArticleMissingBodyState;
  adjacent?: PublicBlogAdjacentPosts;
  related?: PublicBlogPostSummary[];
  ads?: BoardAdsConfig;
}

function shareLinks(permalink: string, title: string) {
  const url = encodeURIComponent(permalink);
  const text = encodeURIComponent(title);

  return {
    x: `https://x.com/intent/post?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}`,
  };
}

function ArticleToc({
  headings,
  className,
}: {
  headings: TocEntry[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((first, second) =>
          first.boundingClientRect.top < second.boundingClientRect.top
            ? first
            : second,
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label={m.blogPost_inThisArticleHeading()} className={className}>
      <p className="text-foreground mb-3 text-sm font-medium">
        {m.blogPost_inThisArticleHeading()}
      </p>
      <ul className="border-border flex flex-col border-s">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={activeId === heading.id ? 'true' : undefined}
              className={cn(
                'focus-visible:ring-ring/30 -ms-px block border-s-2 py-1.5 ps-4 text-sm transition-colors outline-none focus-visible:ring-3',
                activeId === heading.id
                  ? 'border-foreground text-foreground font-medium'
                  : // Avoid text-muted-foreground on the mobile panel's
                    // bg-muted — that pairing fails WCAG AA (~3.x:1).
                    // secondary-foreground is solid body ink and stays ≥4.5:1
                    // on both muted and background surfaces.
                    'text-secondary-foreground hover:text-foreground border-transparent',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ShareLinks({ links }: { links: ReturnType<typeof shareLinks> }) {
  const targets = [
    { href: links.x, label: m.blogPost_shareOnX(), Icon: XIcon },
    {
      href: links.facebook,
      label: m.blogPost_shareOnFacebook(),
      Icon: FacebookIcon,
    },
    {
      href: links.linkedin,
      label: m.blogPost_shareOnLinkedin(),
      Icon: LinkedInIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm font-medium">
        {m.blogPost_shareHeading()}
      </p>
      <div className="flex flex-wrap gap-2">
        {targets.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={buttonVariants({ variant: 'outline', size: 'icon-lg' })}
          >
            <Icon />
          </a>
        ))}
      </div>
    </div>
  );
}

function PostMeta({
  post,
  language,
  links,
  className,
}: {
  post: PublicBlogPost;
  language: string;
  links: ReturnType<typeof shareLinks>;
  className?: string;
}) {
  const dateLine = [
    toBlogArticleVM(post, language).publishedAtLabel,
    post.readingTimeMin
      ? m.blogPost_readingTimeText({ minutes: post.readingTimeMin })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-4">
        {post.authors.length > 0 ? (
          <p className="text-foreground text-sm font-medium">
            {m.blogPost_updatedByHeading()}
          </p>
        ) : null}
        {post.authors.length > 0 ? (
          post.authors.map((author) => (
            <div key={author.id} className="flex gap-3">
              <Avatar size="lg">
                {author.avatarUrl ? (
                  <AvatarImage src={author.avatarUrl} alt={author.name} />
                ) : null}
                <AvatarFallback>{initialsOf(author.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  to="/blog/author/$authorSlug"
                  params={{ authorSlug: author.slug }}
                  className="text-foreground focus-visible:ring-ring/30 w-fit rounded-sm font-medium outline-none hover:underline focus-visible:ring-3"
                >
                  {author.name}
                </Link>
                {author.location?.trim() ? (
                  <span className="text-muted-foreground text-sm">
                    {author.location.trim()}
                  </span>
                ) : null}
                {dateLine ? (
                  <span className="text-muted-foreground text-sm">
                    {dateLine}
                  </span>
                ) : null}
                {author.bio ? (
                  <p className="text-muted-foreground line-clamp-4 text-sm">
                    {author.bio}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        ) : dateLine ? (
          <span className="text-muted-foreground text-sm">{dateLine}</span>
        ) : null}
      </div>

      <ShareLinks links={links} />
    </div>
  );
}

/** Complete reusable article presentation for the canonical post route. */
export function BlogArticleContent({
  breadcrumb: _breadcrumb,
  post,
  language,
  permalink,
  missingBody,
  adjacent = { object: 'blog_adjacent_posts', previous: null, next: null },
  related = [],
  ads,
}: BlogArticleContentProps) {
  const headings = extractToc(post.html);
  const bodyHtml = withHeadingAnchors(post.html);
  const links = shareLinks(permalink, post.title);
  const hasToc = headings.length >= 2;

  return (
    <Page>
      <PageContent
        // The post title and excerpt are API content, so each resolves its
        // own direction from its own first strong character. PageHeader
        // itself stays chrome-directional — it also renders UI-locale titles
        // elsewhere, and the ar-XB pseudo-locale's isolate wrapper would
        // defeat first-strong there.
        header={
          <PageHeader
            title={<span dir="auto">{post.title}</span>}
            description={
              post.customExcerpt ? (
                <span dir="auto">{post.customExcerpt}</span>
              ) : undefined
            }
          />
        }
      >
        <article className="flex min-w-0 flex-col gap-10">
          <PostMeta
            post={post}
            language={language}
            links={links}
            className="border-border border-t pt-6 lg:hidden"
          />

          {post.coverUrl ? (
            <figure className="flex flex-col gap-2">
              <img
                src={post.coverUrl}
                alt={post.featureImageAlt ?? post.title}
                width={1200}
                height={675}
                fetchPriority="high"
                className="ring-foreground/5 aspect-video w-full rounded-3xl object-cover shadow-sm ring-1"
                onError={hideBrokenImage}
              />
              {post.featureImageCaption ? (
                <figcaption className="text-muted-foreground text-sm">
                  {post.featureImageCaption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="grid min-w-0 grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[14rem_minmax(0,1fr)_16rem]">
            {hasToc ? (
              <aside className="hidden lg:col-start-1 lg:row-start-1 lg:block">
                <ArticleToc
                  headings={headings}
                  className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
                />
              </aside>
            ) : null}

            <div className="flex min-w-0 flex-col gap-10 lg:col-start-2 lg:row-start-1">
              {hasToc ? (
                <ArticleToc
                  headings={headings}
                  className="bg-muted rounded-3xl p-5 lg:hidden"
                />
              ) : null}

              {bodyHtml ? (
                <Prose
                  aria-label={m.blogPost_articleBodyLabel()}
                  html={bodyHtml}
                />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileWarning aria-hidden />
                    </EmptyMedia>
                    <h2 className="font-heading text-lg font-medium tracking-tight">
                      {missingBody.title}
                    </h2>
                    <EmptyDescription>
                      {missingBody.description}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <a
                      href={localizePath(missingBody.action.href)}
                      className={buttonVariants({ variant: 'outline' })}
                    >
                      {missingBody.action.label}
                    </a>
                  </EmptyContent>
                </Empty>
              )}

              {post.tags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to="/blog/tag/$tagSlug"
                      params={{ tagSlug: tag.slug }}
                      className="focus-visible:ring-ring/30 rounded-2xl outline-none focus-visible:ring-3"
                    >
                      <Badge
                        variant="secondary"
                        className="h-auto max-w-full whitespace-normal"
                      >
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : null}

              {adjacent.previous || adjacent.next ? (
                <nav
                  aria-label={m.blogPost_adjacentPostsLabel()}
                  className="border-border flex justify-between gap-4 border-t pt-6 text-sm"
                >
                  {adjacent.previous ? (
                    <Link
                      to="/blog/$postSlug"
                      params={{ postSlug: adjacent.previous.slug }}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/30 rounded-sm outline-none focus-visible:ring-3"
                    >
                      ← {adjacent.previous.title}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {adjacent.next ? (
                    <Link
                      to="/blog/$postSlug"
                      params={{ postSlug: adjacent.next.slug }}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/30 rounded-sm text-end outline-none focus-visible:ring-3"
                    >
                      {adjacent.next.title} →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </div>

            <aside className="hidden lg:col-start-3 lg:row-start-1 lg:block">
              <PostMeta
                post={post}
                language={language}
                links={links}
                className="sticky top-8"
              />
              {ads?.enabled && ads.clientId ? (
                <BoardAdSlot
                  placement="blog:post.sidebar"
                  clientId={ads.clientId}
                />
              ) : null}
            </aside>
          </div>

          {related.length > 0 ? (
            <PageSection title={m.blogPost_relatedPostsHeading()}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((relatedPost) => (
                  <PostCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </PageSection>
          ) : null}
        </article>
      </PageContent>
    </Page>
  );
}
