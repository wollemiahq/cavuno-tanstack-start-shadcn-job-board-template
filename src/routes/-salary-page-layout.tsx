import type { ReactNode } from 'react';

import { m } from '../paraglide/messages';

import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { PageHeaderWithBreadcrumb } from '@/components/board/page-header-with-breadcrumb';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { SalaryEmptyState } from '@/components/board/salary-sections';
import { Page, PageContent, PageHeader } from '@/components/layout/page';

export function SalaryPageLayout({
  breadcrumb,
  title,
  description,
  children,
}: {
  breadcrumb: BreadcrumbData;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Page width="wide">
      <PageHeaderWithBreadcrumb
        width="wide"
        breadcrumb={breadcrumb}
        title={title}
        description={description}
      />
      <PageContent>{children}</PageContent>
    </Page>
  );
}

export function SalaryNotFoundPage({ title }: { title: string }) {
  return (
    <Page width="content">
      <PageContent header={<PageHeader title={title} />}>
        <SalaryEmptyState title={title} />
      </PageContent>
    </Page>
  );
}

export function SalaryPendingPage() {
  return <PublicContentPending label={m.publicContent_loadingLabel()} />;
}
