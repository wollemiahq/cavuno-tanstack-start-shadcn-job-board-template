import type { ReactNode } from 'react';

import { Page, PageContent } from '@/components/layout/page';

/**
 * Candidate account content wrapper. Account navigation now lives in the
 * signed-in header's avatar menu (CAV-510), so this shell owns only the page's
 * single main landmark and reading-width content column — no sidebar rail.
 */
export function CandidateAccountShell({ children }: { children: ReactNode }) {
  return (
    <Page width="content">
      <PageContent>
        <div data-slot="candidate-account-content" className="min-w-0">
          {children}
        </div>
      </PageContent>
    </Page>
  );
}
