import type { MouseEvent as ReactMouseEvent } from "react";

import type { JobCardVM } from "@/board/job-view-model";
import { SearchResultCard } from "@/components/search-results/search-results";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || undefined
  );
}

export function JobSearchResult({
  vm,
  selected = false,
  onActivate,
}: {
  vm: JobCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <Avatar size="lg" className="rounded-xl">
        {vm.companyLogoUrl ? (
          <AvatarImage
            src={vm.companyLogoUrl}
            alt={vm.companyName ?? vm.title}
            className="rounded-xl"
          />
        ) : null}
        <AvatarFallback className="rounded-xl">{initialsOf(vm.companyAvatarName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold text-foreground">{vm.title}</h2>
            {vm.companyName ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{vm.companyName}</p>
            ) : null}
          </div>
          {vm.isFeatured ? <Badge variant="secondary">{vm.featuredLabel}</Badge> : null}
        </div>

        {vm.compLine ? <p className="mt-2 text-sm text-foreground">{vm.compLine}</p> : null}
        {vm.summary ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{vm.summary}</p>
        ) : null}
        {vm.postedAtLabel ? (
          <p className="mt-3 text-xs text-muted-foreground">{vm.postedAtLabel}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <SearchResultCard selected={selected} className="p-0">
      {vm.detailHref ? (
        <a
          href={vm.detailHref}
          aria-current={selected ? "true" : undefined}
          onClick={onActivate}
          className="block rounded-[inherit] p-4 outline-none"
        >
          {content}
        </a>
      ) : (
        <div className="p-4">{content}</div>
      )}
    </SearchResultCard>
  );
}
