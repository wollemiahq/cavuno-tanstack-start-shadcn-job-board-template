import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type SearchResultCardProps = ComponentPropsWithoutRef<"article"> & {
  selected?: boolean;
};

/** Shared compact interaction chrome; entity components own all card meaning. */
export function SearchResultCard({ selected = false, className, ...props }: SearchResultCardProps) {
  return (
    <article
      {...props}
      data-slot="search-result-card"
      data-selected={selected}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 text-card-foreground transition-colors hover:bg-accent/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 data-[selected=true]:border-ring data-[selected=true]:bg-accent",
        className,
      )}
    />
  );
}
