import type { MouseEvent as ReactMouseEvent } from 'react';

import type { JobCardVM } from '@/board/job-view-model';
import { SearchResultCard } from '@/components/search-results/search-results';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';

export function JobSearchResult({
  vm,
  selected = false,
  onActivate,
}: {
  vm: JobCardVM;
  selected?: boolean;
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <SearchResultCard selected={selected}>
      <div className="relative flex items-start gap-3 p-4">
        <Avatar size="lg" className="rounded-xl">
          {vm.companyLogoUrl ? (
            <AvatarImage
              src={vm.companyLogoUrl}
              alt=""
              className="rounded-xl"
            />
          ) : null}
          <AvatarFallback className="rounded-xl">
            {initialsOf(vm.companyAvatarName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-foreground line-clamp-2 text-base font-semibold">
                {vm.detailHref ? (
                  <a
                    href={vm.detailHref}
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
                <p className="text-muted-foreground mt-0.5 truncate text-sm">
                  {vm.companyName}
                </p>
              ) : null}
            </div>
            {vm.isFeatured ? (
              <Badge variant="secondary">{vm.featuredLabel}</Badge>
            ) : null}
          </div>

          {vm.compLine ? (
            <p className="text-foreground mt-2 text-sm">{vm.compLine}</p>
          ) : null}
          {vm.summary ? (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
              {vm.summary}
            </p>
          ) : null}
          {vm.tags.length > 0 ? (
            <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {vm.tags.map((tag) => (
                <Badge
                  key={tag.key}
                  variant="outline"
                  render={<a href={tag.href} />}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
          {vm.postedAtLabel ? (
            <p className="text-muted-foreground mt-3 text-xs">
              {vm.postedAtLabel}
            </p>
          ) : null}
        </div>
      </div>
    </SearchResultCard>
  );
}
