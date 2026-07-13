import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SearchResultDetailProps = Omit<
  ComponentPropsWithRef<"section">,
  "aria-label" | "children"
> & {
  label: string;
  scrollRestorationId?: string;
  children: ReactNode;
};

/** The desktop-only, independently scrolling detail projection. */
export function SearchResultDetail({
  label,
  scrollRestorationId = "search-result-detail",
  className,
  children,
  ref,
  ...props
}: SearchResultDetailProps) {
  return (
    <section
      {...props}
      ref={ref}
      aria-label={label}
      data-slot="search-result-detail"
      data-scroll-restoration-id={scrollRestorationId}
      className={cn(
        "hidden min-w-0 md:block md:h-[var(--search-results-height,calc(100dvh-12rem))] md:overflow-y-auto md:overscroll-contain",
        className,
      )}
    >
      {children}
    </section>
  );
}
