import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import type { JobCardVM } from '@/board/job-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { RelativeTimestamp } from '@/components/board/relative-timestamp';
import { SearchResultCard } from '@/components/search-results/search-results';
import { localizePath } from '@/lib/localized-path';

export function JobSearchResult({
  vm,
  selected = false,
  onActivate,
  saveSlot,
}: {
  vm: JobCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  saveSlot?: ReactNode;
}) {
  return (
    <SearchResultCard selected={selected}>
      <div className="relative flex items-start gap-3 p-4">
        <CompanyAvatar
          name={vm.companyAvatarName}
          logoUrl={vm.companyLogoUrl}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-foreground line-clamp-2 text-base font-semibold"
                dir="auto"
              >
                {vm.detailHref ? (
                  <a
                    href={
                      vm.detailHref ? localizePath(vm.detailHref) : undefined
                    }
                    aria-current={selected ? 'true' : undefined}
                    onClick={onActivate}
                    className="outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {vm.title}
                  </a>
                ) : (
                  vm.title
                )}
              </h2>
              {vm.companyName ? (
                <p
                  className="text-foreground mt-0.5 truncate text-sm font-semibold"
                  dir="auto"
                >
                  {vm.companyName}
                </p>
              ) : null}
            </div>
            {vm.isFeatured ? (
              <span className="text-muted-foreground text-xs font-medium">
                {vm.featuredLabel}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground mt-1 text-sm">
            {vm.locationLabel}
          </p>
          {vm.salaryLabel ? (
            <p className="text-foreground mt-2 text-sm">{vm.salaryLabel}</p>
          ) : null}
          {vm.summary ? (
            <p
              className="text-muted-foreground mt-2 line-clamp-2 text-sm"
              dir="auto"
            >
              {vm.summary}
            </p>
          ) : null}
          {vm.postedAtLabel || saveSlot ? (
            <div className="mt-3 flex min-h-8 items-end justify-between gap-3">
              {vm.postedAtLabel ? (
                <p className="text-muted-foreground text-xs">
                  <RelativeTimestamp label={vm.postedAtLabel} />
                </p>
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
