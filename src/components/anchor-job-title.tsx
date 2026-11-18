import { Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import type { JobAlertAnchorJob } from '@cavuno/board';

/** A similar-job alert's name as plain text, for labels and other pages. */
export function anchorJobTitleText(anchorJob: JobAlertAnchorJob) {
  return anchorJob
    ? m.jobAlertMatch_similarTo({ title: anchorJob.title })
    : m.alertManager_similarJobsAlertLabel();
}

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
  const text = anchorJobTitleText(anchorJob);
  if (!anchorJob) return <>{text}</>;
  return path ? (
    <Link to={path} className="text-foreground underline">
      {text}
    </Link>
  ) : (
    <>{text}</>
  );
}
