'use client';

import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { isPreviewUnlockPage } from '@/lib/pagination';

export function PreviewUnlockAlert({
  gatedCount,
  page,
  pageSize,
  visibleCount,
  returnTo,
  language,
}: {
  gatedCount: number | undefined;
  page: number;
  pageSize: number;
  visibleCount: number;
  returnTo: string;
  language: string;
}) {
  if (
    gatedCount === undefined ||
    !(gatedCount > 0) ||
    !isPreviewUnlockPage(page, pageSize, visibleCount)
  ) {
    return null;
  }

  return (
    <Alert
      aria-label={m.jobSearch_unlockMoreLabel()}
      className="bg-muted flex flex-col items-start gap-3 pe-4"
    >
      <AlertDescription>
        {m.jobSearch_gatedCountText({
          count: gatedCount.toLocaleString(language),
        })}
      </AlertDescription>
      <AlertAction className="static">
        <Link
          to="/account/access"
          search={{ returnTo }}
          className={buttonVariants({ size: 'sm' })}
        >
          {m.jobSearch_unlockMoreLabel()}
        </Link>
      </AlertAction>
    </Alert>
  );
}
