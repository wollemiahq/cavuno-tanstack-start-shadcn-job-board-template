import type { JobDetailCompanyVM } from '@/board/job-detail-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { m } from '../../paraglide/messages';

export function JobAboutCompanyCard({
  company,
}: {
  company: JobDetailCompanyVM;
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
              <p className="min-w-0 truncate font-medium">{company.name}</p>
            </div>
          ) : null}
        </div>

        {company.intro ? (
          <p className="text-muted-foreground [overflow-wrap:anywhere]">
            {company.intro}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <a
          href={company.href}
          className={buttonVariants({
            variant: 'outline',
            className: 'w-full',
          })}
        >
          {company.viewProfileLabel}
        </a>
      </CardFooter>
    </Card>
  );
}
