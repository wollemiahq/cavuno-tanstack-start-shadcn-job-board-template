import { CompanyAvatar } from '@/components/board/company-avatar';
import { MembershipBadge } from '@/components/board/membership-badge';
import { MasterDetailLink } from '@/components/master-detail-link';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { companyDestination } from '@/lib/master-detail-destination';
/**
 * One company as an owned shadcn card row. Pure markup: the
 * companies index, the market-scoped browse, and the similar-companies
 * rail all share this row, so the surface reads as one system (mirrors
 * how every list surface shares `JobCard`).
 *
 * The owned Card supplies the shared radius, ring, and shadow, lifting on
 * hover like `JobCard`. The company mark falls
 * back to two-letter initials when there is no logo. The open-count Badge
 * is shown ONLY when the company has open roles (an empty company earns no
 * "0 open jobs" noise), and the teaser line is honestly omitted when
 * `summary` is null.
 *
 * Teaser source is the wire `summary` only. The Board API already applies
 * authored-summary-or-derive-from-description; the card does not re-flatten
 * long-form HTML.
 */

export function CompanyCard({
  companySlug,
  name,
  logoUrl,
  summary,
  publishedJobCount,
  jobCountLabel,
  membershipPlanName = null,
}: {
  companySlug: string;
  name: string;
  logoUrl: string | null;
  /**
   * Card teaser from the public company wire (`CompanyPublic.summary`).
   * Already cleaned by the API: operator-authored one-liner when set,
   * else a plain-text first-sentence of the description, or `null`.
   */
  summary: string | null;
  publishedJobCount: number;
  /** Pre-resolved, pluralized "N open job(s)" label from the route. */
  jobCountLabel: string;
  /** Membership plan name from the wire, or `null` when the company has none. */
  membershipPlanName?: string | null;
}) {
  const descriptionText = summary?.trim() ?? '';

  return (
    <Card
      role="article"
      className="h-full gap-4 transition-shadow hover:shadow-md"
    >
      <CardContent className="flex items-start gap-3">
        <CompanyAvatar name={name} logoUrl={logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <CardTitle>
            <h3 dir="auto">
              <MasterDetailLink
                destination={companyDestination({ companySlug })}
                className="text-foreground hover:text-primary focus-visible:ring-ring rounded-sm transition-colors hover:no-underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {name}
              </MasterDetailLink>
            </h3>
          </CardTitle>
          {descriptionText ? (
            <CardDescription className="mt-1 line-clamp-2" dir="auto">
              {descriptionText}
            </CardDescription>
          ) : null}
          <MembershipBadge planName={membershipPlanName} className="mt-2" />
        </div>
        {/* The count stays at the top-right while the flexible identity column
            keeps the name beside the logo even when there is no description. */}
        {publishedJobCount > 0 ? (
          <div className="shrink-0">
            <Badge variant="secondary">{jobCountLabel}</Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
