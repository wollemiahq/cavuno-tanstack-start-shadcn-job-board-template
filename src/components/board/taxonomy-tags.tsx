"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TaxonomyChip {
  key: string;
  name: string;
  href: string;
}

const chipSize = {
  sm: "h-5 px-2 text-xs",
  md: "h-6 px-2.5 text-sm",
  lg: "h-7 px-3 text-sm",
};

export function TaxonomyTags({
  chips,
  overflow = 0,
  size = "md",
}: {
  chips: TaxonomyChip[];
  overflow?: number;
  size?: "sm" | "md" | "lg";
}) {
  if (chips.length === 0 && overflow <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          render={<a href={chip.href} />}
          variant="outline"
          className={cn(chipSize[size], "hover:no-underline")}
        >
          {chip.name}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge variant="outline" className={chipSize[size]}>
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}
