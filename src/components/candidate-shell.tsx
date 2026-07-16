import type { ReactNode } from 'react';

import { CandidateAccountShell } from '@/components/board/candidate-account-shell';

/**
 * Thin wrapper for the candidate account pages. The account navigation moved to
 * the signed-in header avatar menu (CAV-510); this simply renders the page
 * content inside the shared account content shell.
 */
export function CandidateShell({ children }: { children: ReactNode }) {
  return <CandidateAccountShell>{children}</CandidateAccountShell>;
}
