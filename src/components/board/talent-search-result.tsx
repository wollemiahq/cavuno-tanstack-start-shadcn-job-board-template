import type { ReactNode } from 'react';

import type { TalentCardVM } from '@/board/talent-view-model';
import { talentCardSelectionKey } from '@/board/talent-view-model';
import { MasterDetailLink } from '@/components/master-detail-link';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';
import { talentDestination } from '@/lib/master-detail-destination';

export function TalentSearchResult({
  vm,
  selected = false,
  saveSlot,
}: {
  vm: TalentCardVM;
  selected?: boolean;
  saveSlot?: ReactNode;
}) {
  const selectionKey = talentCardSelectionKey(vm);
  const selectable = Boolean(selectionKey);

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
            {selectionKey ? (
              <MasterDetailLink
                destination={talentDestination({ handle: selectionKey })}
                aria-current={selected ? 'true' : undefined}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {vm.displayName}
              </MasterDetailLink>
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
