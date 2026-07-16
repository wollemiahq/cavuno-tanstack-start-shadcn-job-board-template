import type { ReactNode } from 'react';

import { CandidateAccountShell } from '@/components/board/candidate-account-shell';

/**
 * Thin wrapper for the candidate account pages. The account navigation moved to
 * the signed-in header avatar menu (CAV-510); this simply renders the page
 * content inside the shared account content shell. An optional `aside` (with
 * its accessible `asideLabel`) renders as the shell's complementary rail.
 */
export function CandidateShell({
  children,
  aside,
  asideLabel,
}: {
  children: ReactNode;
  aside?: ReactNode;
  asideLabel?: string;
}) {
  return (
    <CandidateAccountShell aside={aside} asideLabel={asideLabel}>
      {children}
    </CandidateAccountShell>
  );
}
