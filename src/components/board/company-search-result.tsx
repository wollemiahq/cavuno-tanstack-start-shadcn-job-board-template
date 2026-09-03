import type { MouseEvent as ReactMouseEvent } from 'react';

import type { CompanyCardVM } from '@/board/company-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { MembershipBadge } from '@/components/board/membership-badge';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Badge } from '@/components/ui/badge';
import { localizePath } from '@/lib/localized-path';

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
        href={vm.detailHref ? localizePath(vm.detailHref) : undefined}
        aria-current={selected ? 'true' : undefined}
        onClick={onActivate}
        className="block rounded-[inherit] p-4 outline-none"
      >
        <div className="flex items-start gap-3">
          <CompanyAvatar name={vm.avatarName} logoUrl={vm.logoUrl} size="lg" />

          <div className="min-w-0 flex-1">
            <h2
              className="text-foreground line-clamp-2 text-base font-semibold"
              dir="auto"
            >
              {vm.name}
            </h2>
            {vm.descriptionText ? (
              <p
                className="text-muted-foreground mt-2 line-clamp-2 text-sm"
                dir="auto"
              >
                {vm.descriptionText}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 empty:mt-0">
              <MembershipBadge planName={vm.membershipPlanName} />
              {vm.publishedJobCount > 0 && vm.openJobsLabel ? (
                <Badge variant="secondary">{vm.openJobsLabel}</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </a>
    </SearchResultCard>
  );
}
