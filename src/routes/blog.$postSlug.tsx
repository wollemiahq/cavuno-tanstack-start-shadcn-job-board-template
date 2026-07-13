import { Text } from "@/components/text"
import { useEffect, useState } from "react";
import { createFileRoute, getRouteApi, Link, notFound, redirect } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";
import { formatDate } from "@cavuno/board/format";
import { createBlogArticleJsonLd, createBreadcrumbJsonLd } from "@cavuno/board/seo";

import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { PageBody } from "@/components/board/page-body";
import { Facebook, LinkedIn, X } from "@/components/foundations/social-icons";
import { JsonLd } from "@/components/json-ld";
import { Prose } from "@/components/prose";
import { cx } from "@/utils/cx";
import { PostCard } from "../components/post-card";
import { extractToc, withHeadingAnchors, type TocEntry } from "../lib/article-toc";
import { selectRelatedPosts } from "../lib/related-posts";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import {
  getBlogPost,
  getBlogPostAdjacent,
  getSeoBase,
  listBlogPosts,
} from "../server/queries";

const rootApi = getRouteApi("__root__");

export const Route = createFileRoute("/blog/$postSlug")({
  // Full-bleed so PageBody owns the container + the breadcrumb placement (the
  // trail hugs the nav at pt-4/5, same as every other page).
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let post;
    try {
      post = await getBlogPost({ data: { postSlug: params.postSlug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }

    // Slug-history (renamed post) OR formatting (case/whitespace) → 308 to the
    // canonical slug, mirroring the hosted board's `permanentRedirect`.
    const target =
      (post.redirected ? post.newSlug : null) ?? (post.slug !== params.postSlug ? post.slug : null);
    if (target && target !== params.postSlug) {
      throw redirect({
        to: "/blog/$postSlug",
        params: { postSlug: target },
        statusCode: 308,
      });
    }

    // Prev/next + related are loaded against the canonical slug. Related
    // posts prefer those sharing the post's first tag, filled out with the
    // latest posts (`selectRelatedPosts`) — both fetched via the core
    // blog-list endpoint; a tag-less post skips the tag read.
    const firstTagSlug = post.tags[0]?.slug ?? null;
    const [adjacent, byTag, latest, seo] = await Promise.all([
      getBlogPostAdjacent({ data: { postSlug: post.slug } }),
      firstTagSlug
        ? listBlogPosts({ data: { tagSlug: firstTagSlug, limit: 4 } })
        : Promise.resolve(null),
      listBlogPosts({ data: { limit: 4 } }),
      getSeoBase(),
    ]);

    const related = selectRelatedPosts({
      currentId: post.id,
      byTag: byTag?.data ?? [],
      latest: latest.data,
      limit: 3,
    });

    return { post, adjacent, related, seo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post, seo } = loaderData;
    // og:image is the STARTER's own /og route (a self-sufficient render),
    // unless the post carries an explicit OG image set by the operator.
    const ogImage = post.ogImageUrl ?? `${seo.origin}/blog/${post.slug}/og`;
    return {
      meta: [
        { title: post.seoTitle ?? post.title },
        ...((post.seoDescription ?? post.customExcerpt)
          ? [
              {
                name: "description",
                content: (post.seoDescription ?? post.customExcerpt)!,
              },
            ]
          : []),
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        {
          rel: "canonical",
          href: post.canonicalUrl ?? `${seo.origin}/blog/${post.slug}`,
        },
      ],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <p className="rounded-xl bg-primary p-10 text-center text-tertiary ring-1 ring-secondary_alt">
      {m.blogPost_notFoundText()}
    </p>
  ),
});

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

/** Canonical share targets — plain intent/sharer URLs, encoded once. */
function shareLinks(permalink: string, title: string) {
  const url = encodeURIComponent(permalink);
  const text = encodeURIComponent(title);
  return {
    x: `https://x.com/intent/post?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}`,
  };
}

/**
 * "In this article" rail. Anchor links render server-side; on the client an
 * IntersectionObserver highlights whichever section currently sits in the top
 * third of the viewport (rootMargin shrinks the observed band to `-70%` of the
 * bottom), so the active item is the last heading scrolled past.
 */
function ArticleToc({ headings, className }: { headings: TocEntry[]; className?: string }) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label={m.blogPost_inThisArticleHeading()} className={className}>
      <p className="mb-3 text-sm font-semibold text-brand-secondary">
        {m.blogPost_inThisArticleHeading()}
      </p>
      <ul className="flex flex-col border-l border-secondary">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cx(
                  "-ml-px block rounded-xs border-l-2 py-1.5 pl-4 text-sm outline-focus-ring transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  isActive
                    ? "border-brand font-semibold text-primary"
                    : "border-transparent text-tertiary hover:text-secondary",
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Row of bordered, square social-share icon buttons. */
function ShareButtons({ links }: { links: ReturnType<typeof shareLinks> }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-secondary">{m.blogPost_shareHeading()}</p>
      <div className="flex gap-2">
        <ButtonUtility
          color="secondary"
          size="sm"
          icon={X}
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.blogPost_shareOnX()}
        />
        <ButtonUtility
          color="secondary"
          size="sm"
          icon={Facebook}
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.blogPost_shareOnFacebook()}
        />
        <ButtonUtility
          color="secondary"
          size="sm"
          icon={LinkedIn}
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.blogPost_shareOnLinkedin()}
        />
      </div>
    </div>
  );
}

/**
 * "Updated by" author card + share row. Lives in the right rail on lg+, and
 * collapses to a row under the title on smaller viewports.
 */
function PostMeta({
  post,
  language,
  links,
  className,
}: {
  post: Awaited<ReturnType<typeof getBlogPost>>;
  language: string;
  links: ReturnType<typeof shareLinks>;
  className?: string;
}) {
  const dateLine = [
    post.publishedAt ? formatDate(language, post.publishedAt) : null,
    post.readingTimeMin ? m.blogPost_readingTimeText({ minutes: post.readingTimeMin }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cx("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-4">
        {post.authors.length > 0 ? (
          <p className="text-sm font-semibold text-secondary">{m.blogPost_updatedByHeading()}</p>
        ) : null}
        {post.authors.length > 0 ? (
          post.authors.map((author) => (
            <div key={author.id} className="flex gap-3">
              <Avatar
                size="lg"
                src={author.avatarUrl}
                initials={initialsOf(author.name)}
                alt={author.name}
              />
              <div className="flex flex-col gap-0.5">
                <Link
                  to="/blog/author/$authorSlug"
                  params={{ authorSlug: author.slug }}
                  className="rounded-xs font-semibold text-primary outline-focus-ring transition-colors hover:text-brand-secondary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {author.name}
                </Link>
                {dateLine ? <span className="text-sm text-tertiary">{dateLine}</span> : null}
                {/* The rail is narrow — a full multi-paragraph bio becomes a wall of text, so clamp it. */}
                {author.bio ? <p className="mt-1 line-clamp-4 text-sm text-tertiary">{author.bio}</p> : null}
              </div>
            </div>
          ))
        ) : dateLine ? (
          <span className="text-sm text-tertiary">{dateLine}</span>
        ) : null}
      </div>

      <ShareButtons links={links} />
    </div>
  );
}

function PostPage() {
  const { post, adjacent, related, seo } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();

  const permalink = post.canonicalUrl ?? `${seo.origin}/blog/${post.slug}`;
  const headings = extractToc(post.html);
  const bodyHtml = withHeadingAnchors(post.html);
  const links = shareLinks(permalink, post.title);
  const hasToc = headings.length >= 2;

  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBlogArticleJsonLd({
      post,
      boardName: seo.boardName,
      permalink,
      // Fallback when the post has no cover — the operator OG image, else
      // the starter's own generated /og card (same source as og:image).
      ogImageUrl: post.ogImageUrl ?? `${seo.origin}/blog/${post.slug}/og`,
    }),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog, href: `${seo.origin}/blog` },
      { label: post.title },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <PageBody
      breadcrumb={{
        ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
        items: [
          { name: crumbs.home, href: "/" },
          { name: crumbs.blog, href: "/blog" },
          { name: post.title },
        ],
      }}
    >
      <article className="flex flex-col gap-10">
        <JsonLd data={jsonLd} />

        <header className="mx-auto flex w-full max-w-container flex-col gap-5">
        <Text as="h1" variant="heading1" className="text-balance md:text-display-md">
          {post.title}
        </Text>
        {post.customExcerpt ? (
          <p className="text-lg leading-relaxed text-tertiary">{post.customExcerpt}</p>
        ) : null}
        {/* Below lg the author + share meta rides under the title. */}
        <PostMeta
          post={post}
          language={board.language}
          links={links}
          className="border-t border-secondary pt-6 lg:hidden"
        />
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.featureImageAlt ?? post.title}
            className="w-full rounded-xl ring-1 ring-secondary_alt"
          />
        ) : null}
      </header>

      <div className="mx-auto grid w-full max-w-container grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[14rem_minmax(0,1fr)_16rem]">
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
            <ArticleToc headings={headings} className="rounded-xl bg-secondary p-5 lg:hidden" />
          ) : null}

          {bodyHtml ? (
            // Post HTML arrives pre-sanitized from the Board API; anchor ids are
            // injected by withHeadingAnchors so the TOC links resolve.
            <Prose html={bodyHtml} />
          ) : null}

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to="/blog/tag/$tagSlug"
                  params={{ tagSlug: tag.slug }}
                  className="rounded-full outline-focus-ring transition duration-100 ease-linear hover:opacity-75 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-1"
                >
                  <Badge type="pill-color" color="gray" size="md">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {adjacent.previous || adjacent.next ? (
            <nav className="flex justify-between gap-4 border-t border-secondary pt-6 text-sm">
              {adjacent.previous ? (
                <Link
                  to="/blog/$postSlug"
                  params={{ postSlug: adjacent.previous.slug }}
                  className="text-tertiary transition-colors hover:text-primary hover:no-underline"
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
                  className="text-right text-tertiary transition-colors hover:text-primary hover:no-underline"
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
          <PostMeta post={post} language={board.language} links={links} className="sticky top-8" />
        </aside>
      </div>

      {related.length > 0 ? (
        <section
          aria-label={m.blogPost_relatedPostsHeading()}
          className="mx-auto w-full max-w-container border-t border-secondary pt-10"
        >
          <Text as="h2" variant="heading2" className="mb-6">
            {m.blogPost_relatedPostsHeading()}
          </Text>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}
      </article>
    </PageBody>
  );
}
