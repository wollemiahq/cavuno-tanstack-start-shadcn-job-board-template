import type { ReactNode } from 'react';

import { m } from '../paraglide/messages';

import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { SalaryEmptyState } from '@/components/board/salary-sections';
import { Page, PageContent, PageHeader } from '@/components/layout/page';

export function SalaryPageLayout({
  breadcrumb: _breadcrumb,
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
      <PageContent
        header={<PageHeader title={title} description={description} />}
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

export function SalaryPendingPage() {
  return <PublicContentPending label={m.publicContent_loadingLabel()} />;
}
