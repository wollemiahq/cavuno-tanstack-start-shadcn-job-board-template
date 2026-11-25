import { useEffect, useState } from 'react';

import { m } from '../paraglide/messages';

import type { TocEntry } from '@/lib/article-toc';
import { cn } from '@/lib/utils';

/**
 * The "In this article" rail of a long-form page: one link per `<h2>`, with
 * the section in view marked current. Blog posts and help articles share it.
 */
export function ArticleToc({
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
