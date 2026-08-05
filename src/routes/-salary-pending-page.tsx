import { m } from '../paraglide/messages';

import { PublicContentPending } from '@/components/board/public-content-pending';

export function SalaryPendingPage() {
  return <PublicContentPending label={m.publicContent_loadingLabel()} />;
}
