import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import type { JobDetailCompanyVM } from '@/board/job-detail-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { MembershipBadge } from '@/components/board/membership-badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function JobAboutCompanyCard({
  company,
  salariesLinked = false,
}: {
  company: JobDetailCompanyVM;
  /**
   * Link the company's salaries page. Only when the Board API marks that page
   * indexable (the job-detail loader reads the verdict).
   */
  salariesLinked?: boolean;
}) {
  return (
    <Card data-slot="job-detail-company" size="sm">
      <CardHeader>
        <CardTitle>
          <h3>{m.jobDetail_aboutCompanyHeading()}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          {company.name ? (
            <div className="flex min-w-0 items-center gap-3">
              <CompanyAvatar
                name={company.name}
                logoUrl={company.logoUrl}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate font-medium" dir="auto">
                  {company.name}
                </p>
                <MembershipBadge
                  planName={company.membershipPlanName}
                  className="mt-1"
                />
              </div>
            </div>
          ) : null}
        </div>

        {company.intro ? (
          <p className="text-muted-foreground [overflow-wrap:anywhere]">
            {company.intro}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Link
          to={company.href}
          className={buttonVariants({
            variant: 'outline',
            className: 'w-full',
          })}
        >
          {company.viewProfileLabel}
        </Link>
        <Link
          to="/companies/$companySlug/jobs"
          params={{ companySlug: company.slug }}
          className={buttonVariants({ variant: 'link' })}
        >
          {company.name
            ? m.jobDetail_companyJobsLink({ company: company.name })
            : m.jobDetail_companyJobsFallbackLink()}
        </Link>
        {salariesLinked ? (
          <Link
            to="/companies/$companySlug/salaries"
            params={{ companySlug: company.slug }}
            className={buttonVariants({ variant: 'link' })}
          >
            {company.name
              ? m.jobDetail_companySalariesLink({ company: company.name })
              : m.jobDetail_companySalariesFallbackLink()}
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  );
}
