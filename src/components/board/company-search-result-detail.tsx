import { Link } from '@tanstack/react-router';

import type { CompanyDetailVM } from '@/board/company-view-model';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

export function CompanySearchResultDetail({
  vm,
  interactive = true,
}: {
  vm: CompanyDetailVM;
  interactive?: boolean;
}) {
  return (
    <article>
      {interactive ? (
        <div
          data-slot="company-detail-actions"
          className="border-border bg-background/95 sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b p-4 backdrop-blur"
        >
          <a href={vm.detailHref} className={buttonVariants()}>
            {vm.viewCompanyLabel}
          </a>
          {vm.publishedJobCount > 0 ? (
            <Link
              to="/companies/$companySlug/jobs"
              params={{ companySlug: vm.companySlug }}
              className={buttonVariants({ variant: 'outline' })}
            >
              {vm.viewJobsLabel}
            </Link>
          ) : null}
          {vm.websiteHref ? (
            <a
              href={vm.websiteHref}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              {vm.visitWebsiteLabel}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-8 p-5 md:p-6">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="rounded-xl">
              {vm.logoUrl ? (
                <AvatarImage
                  src={vm.logoUrl}
                  alt={vm.name}
                  className="rounded-xl"
                />
              ) : null}
              <AvatarFallback className="rounded-xl">
                {initialsOf(vm.avatarName)}
              </AvatarFallback>
            </Avatar>
            <Text as="h2" variant="heading2">
              {vm.name}
            </Text>
          </div>
          {vm.openJobsLabel ? (
            <Badge variant="secondary">{vm.openJobsLabel}</Badge>
          ) : null}
        </header>

        {vm.descriptionHtml ? (
          <Prose html={vm.descriptionHtml} />
        ) : (
          <p className="text-muted-foreground">{vm.noDescriptionText}</p>
        )}

        {vm.marketChips.length > 0 ? (
          <section aria-label={vm.marketsHeading} className="space-y-2">
            <h3 className="text-foreground text-sm font-semibold">
              {vm.marketsHeading}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {vm.marketChips.map((market) =>
                interactive ? (
                  <a
                    key={market.key}
                    href={market.href}
                    className={badgeVariants({ variant: 'outline' })}
                  >
                    {market.name}
                  </a>
                ) : (
                  <span
                    key={market.key}
                    className={badgeVariants({ variant: 'outline' })}
                  >
                    {market.name}
                  </span>
                ),
              )}
            </div>
          </section>
        ) : null}

        {vm.websiteHref && vm.websiteLabel ? (
          <dl className="grid gap-2 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
            <dt className="text-muted-foreground text-sm font-medium">
              {vm.websiteHeading}
            </dt>
            <dd>
              {interactive ? (
                <a
                  href={vm.websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    badgeVariants({ variant: 'link' }),
                    'h-auto px-0',
                  )}
                >
                  {vm.websiteLabel}
                </a>
              ) : (
                <span className="text-foreground text-sm">
                  {vm.websiteLabel}
                </span>
              )}
            </dd>
          </dl>
        ) : null}
      </div>
    </article>
  );
}
