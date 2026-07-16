import type { ReactNode } from 'react';

import { Page, PageContent } from '@/components/layout/page';

/**
 * Candidate account content wrapper. Account navigation now lives in the
 * signed-in header's avatar menu (CAV-510), so this shell owns only the page's
 * single main landmark and content column. Pages with a complementary rail
 * (e.g. the profile-completeness card on /account) pass `aside` + `asideLabel`
 * and get the wide two-column PageContent geometry; without one the shell
 * stays a single reading-width column.
 */
export function CandidateAccountShell({
  children,
  aside,
  asideLabel,
}: {
  children: ReactNode;
  aside?: ReactNode;
  asideLabel?: string;
}) {
  const content = (
    <div data-slot="candidate-account-content" className="min-w-0">
      {children}
    </div>
  );
  if (aside && asideLabel) {
    return (
      <Page width="wide">
        <PageContent aside={aside} asideLabel={asideLabel}>
          {content}
        </PageContent>
      </Page>
    );
  }
  return (
    <Page width="content">
      <PageContent>{content}</PageContent>
    </Page>
  );
}
