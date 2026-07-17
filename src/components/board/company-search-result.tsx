import type { MouseEvent as ReactMouseEvent } from 'react';

import type { CompanyCardVM } from '@/board/company-view-model';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';

export function CompanySearchResult({
  vm,
  selected = false,
  onActivate,
}: {
  vm: CompanyCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <SearchResultCard selected={selected} className="p-0">
      <a
        href={vm.detailHref}
        aria-current={selected ? 'true' : undefined}
        onClick={onActivate}
        className="block rounded-[inherit] p-4 outline-none"
      >
        <div className="flex items-start gap-3">
          <Avatar size="lg" className="rounded-xl after:rounded-xl">
            {vm.logoUrl ? (
              <AvatarImage
                src={vm.logoUrl}
                alt={vm.name}
                className="rounded-xl"
              />
            ) : (
              <AvatarFallback className="rounded-xl">
                {initialsOf(vm.avatarName)}
              </AvatarFallback>
            )}
          </Avatar>

          <div className="min-w-0 flex-1">
            <h2 className="text-foreground line-clamp-2 text-base font-semibold">
              {vm.name}
            </h2>
            {vm.descriptionText ? (
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                {vm.descriptionText}
              </p>
            ) : null}
            {vm.publishedJobCount > 0 && vm.openJobsLabel ? (
              <Badge variant="secondary" className="mt-3">
                {vm.openJobsLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </a>
    </SearchResultCard>
  );
}
