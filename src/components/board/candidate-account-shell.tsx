import type { ReactNode } from 'react';

import { Page, PageContent, PageHeader } from '@/components/layout/page';

/**
 * Candidate account content wrapper. Account navigation now lives in the
 * signed-in header's avatar menu, so this shell owns only the page's
 * single main landmark and content column. `title`/`description`/`actions`
 * render the canonical PageHeader; pages with a complementary rail (e.g. the
 * profile-completeness card on /account) pass `aside` + `asideLabel` and get
 * the wide two-column PageContent geometry.
 */
export function CandidateAccountShell({
  children,
  title,
  description,
  actions,
  aside,
  asideLabel,
}: {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  asideLabel?: string;
}) {
  const header = title ? (
    <PageHeader title={title} description={description} actions={actions} />
  ) : undefined;
  const content = (
    <div data-slot="candidate-account-content" className="min-w-0">
      {children}
    </div>
  );
  if (aside && asideLabel) {
    return (
      <Page width="wide">
        <PageContent header={header} aside={aside} asideLabel={asideLabel}>
          {content}
        </PageContent>
      </Page>
    );
  }
  return (
    <Page width="content">
      <PageContent header={header}>{content}</PageContent>
    </Page>
  );
}
