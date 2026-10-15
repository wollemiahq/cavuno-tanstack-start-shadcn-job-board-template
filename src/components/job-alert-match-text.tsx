import { Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import type { AnchorJobPaths, JobAlertMatch } from '@/board/job-alert-match';

/**
 * The leading "what it matches" text of an alert row: a similar-job alert
 * names (and links, when the job still resolves) its anchor job; a search
 * alert quotes its keywords, or lists an older alert's job functions.
 * Filter alerts render the caller's own filter labels (`filtersText`).
 */
export function JobAlertMatchText({
  match,
  anchorJobPaths,
  filtersText,
}: {
  match: JobAlertMatch;
  anchorJobPaths: AnchorJobPaths;
  filtersText: string;
}) {
  if (match.kind === 'similar_job') {
    const text = m.jobAlertMatch_similarTo({ title: match.anchorJob.title });
    const path = match.anchorJob.slug
      ? anchorJobPaths[match.anchorJob.slug]
      : undefined;
    return path ? (
      <Link to={path} className="text-foreground underline">
        {text}
      </Link>
    ) : (
      <>{text}</>
    );
  }
  if (match.kind === 'search') {
    return (
      <>
        {match.query
          ? m.jobAlertMatch_quotedQuery({ query: match.query })
          : match.jobFunctions.join(', ')}
      </>
    );
  }
  return <>{filtersText}</>;
}
