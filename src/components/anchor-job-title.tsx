import { Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import type { JobAlertAnchorJob } from '@cavuno/board';

/**
 * What a similar-job alert follows: its anchor job's title, linked when the
 * job still resolves to a page. An alert whose anchor job was never captured
 * reads as plain "Similar jobs".
 */
export function AnchorJobTitle({
  anchorJob,
  path,
}: {
  anchorJob: JobAlertAnchorJob;
  path: string | undefined;
}) {
  if (!anchorJob) return <>{m.alertManager_similarJobsAlertLabel()}</>;
  const text = m.jobAlertMatch_similarTo({ title: anchorJob.title });
  return path ? (
    <Link to={path} className="text-foreground underline">
      {text}
    </Link>
  ) : (
    <>{text}</>
  );
}
