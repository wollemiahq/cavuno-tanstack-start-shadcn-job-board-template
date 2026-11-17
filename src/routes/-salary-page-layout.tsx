import type { ReactNode } from 'react';

import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { SalaryEmptyState } from '@/components/board/salary-sections';
import { Page, PageContent, PageHeader } from '@/components/layout/page';

export function SalaryPageLayout({
  breadcrumb: _breadcrumb,
  title,
  description,
  links,
  children,
}: {
  breadcrumb: BreadcrumbData;
  title: string;
  description?: string;
  /** Links to related pages, shown under the heading on every state. */
  links?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Page width="wide">
      <PageContent
        header={
          <PageHeader title={title} description={description}>
            {links ? (
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{links}</p>
            ) : null}
          </PageHeader>
        }
      >
        {children}
      </PageContent>
    </Page>
  );
}

export function SalaryNotFoundPage({ title }: { title: string }) {
  return (
    <Page width="wide">
      <PageContent header={<PageHeader title={title} />}>
        <SalaryEmptyState title={title} />
      </PageContent>
    </Page>
  );
}
