import type { ReactNode } from 'react';

import { CandidateAccountShell } from '@/components/board/candidate-account-shell';

/**
 * Thin wrapper for the candidate account pages. The account navigation moved to
 * the signed-in header avatar menu; this simply renders the page
 * content inside the shared account content shell. `title`/`description`/
 * `actions` render the canonical PageHeader; an optional `aside` (with its
 * accessible `asideLabel`) renders as the shell's complementary rail.
 */
export function CandidateShell({
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
  return (
    <CandidateAccountShell
      title={title}
      description={description}
      actions={actions}
      aside={aside}
      asideLabel={asideLabel}
    >
      {children}
    </CandidateAccountShell>
  );
}
