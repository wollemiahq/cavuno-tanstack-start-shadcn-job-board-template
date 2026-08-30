import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import type { TalentCardVM } from '@/board/talent-view-model';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';
import { localizePath } from '@/lib/localized-path';

export function TalentSearchResult({
  vm,
  selected = false,
  onActivate,
  saveSlot,
}: {
  vm: TalentCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  saveSlot?: ReactNode;
}) {
  const selectable = Boolean(vm.detailHref);
  return (
    <SearchResultCard
      selected={selectable && selected}
      className="p-0"
      data-redacted={vm.redacted ? 'true' : undefined}
    >
      <div className="relative flex items-start gap-3 p-4">
        <Avatar size="lg">
          {vm.avatarUrl ? (
            <AvatarImage src={vm.avatarUrl} alt={vm.avatarName} />
          ) : null}
          <AvatarFallback>{initialsOf(vm.avatarName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h2
            className="text-foreground line-clamp-2 text-base font-semibold"
            dir="auto"
          >
            {vm.detailHref ? (
              <a
                href={localizePath(vm.detailHref)}
                aria-current={selected ? 'true' : undefined}
                onClick={onActivate}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {vm.displayName}
              </a>
            ) : (
              vm.displayName
            )}
          </h2>
          {vm.headline ? (
            <p
              className="text-muted-foreground mt-0.5 line-clamp-2 text-sm"
              dir="auto"
            >
              {vm.headline}
            </p>
          ) : null}
          {vm.location ? (
            <p className="text-muted-foreground mt-2 text-sm">{vm.location}</p>
          ) : null}

          {vm.jobSearchStatusLabel || vm.skills.length > 0 || saveSlot ? (
            <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
              {vm.jobSearchStatusLabel || vm.skills.length > 0 ? (
                <div className="flex h-5 min-w-0 flex-1 flex-wrap gap-1.5 overflow-hidden">
                  {vm.jobSearchStatusLabel ? (
                    <Badge variant="secondary">{vm.jobSearchStatusLabel}</Badge>
                  ) : null}
                  {vm.skills.slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span />
              )}
              {saveSlot ? (
                <div className="relative z-10 shrink-0">{saveSlot}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </SearchResultCard>
  );
}
