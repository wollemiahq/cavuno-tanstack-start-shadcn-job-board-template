import type { MouseEvent as ReactMouseEvent } from "react";

import type { TalentCardVM } from "@/board/talent-view-model";
import { SearchResultCard } from "@/components/search-results/search-results";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initialsOf } from "@/lib/initials";

export function TalentSearchResult({
  vm,
  selected = false,
  onActivate,
}: {
  vm: TalentCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  const selectable = Boolean(vm.detailHref);
  const content = (
    <div className="flex items-start gap-3">
      <Avatar size="lg">
        {vm.avatarUrl ? (
          <img
            src={vm.avatarUrl}
            alt={vm.avatarName}
            className="aspect-square size-full rounded-full object-cover"
          />
        ) : null}
        <AvatarFallback>{initialsOf(vm.avatarName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-base font-semibold text-foreground">
          {vm.displayName}
        </h2>
        {vm.headline ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {vm.headline}
          </p>
        ) : null}
        {vm.location ? (
          <p className="mt-2 text-sm text-muted-foreground">{vm.location}</p>
        ) : null}

        {vm.jobSearchStatusLabel || vm.skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vm.jobSearchStatusLabel ? (
              <Badge variant="secondary">{vm.jobSearchStatusLabel}</Badge>
            ) : null}
            {vm.skills.slice(0, 6).map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <SearchResultCard selected={selectable && selected} className="p-0">
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
