import { Link } from '@tanstack/react-router';

import { CompanyAvatar } from '@/components/board/company-avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
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
 *"0 open jobs" noise), and the description line is honestly omitted when
 * absent — the API sends it as (pre-sanitized) HTML, so it is flattened to
 * plain text and clamped rather than rendered as markup inside a card.
 */

/** Flatten the API's (pre-sanitized) description HTML to a trimmed text line. */
function toPlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CompanyCard({
  companySlug,
  name,
  logoUrl,
  description,
  publishedJobCount,
  jobCountLabel,
}: {
  companySlug: string;
  name: string;
  logoUrl: string | null;
  /** Long-form company description (pre-sanitized HTML) or null. */
  description: string | null;
  publishedJobCount: number;
  /** Pre-resolved, pluralized"N open job(s)" label from the route. */
  jobCountLabel: string;
}) {
  const descriptionText = description ? toPlainText(description) : '';

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
              <Link
                to="/companies/$companySlug"
                params={{ companySlug }}
                className="text-foreground hover:text-primary focus-visible:ring-ring rounded-sm transition-colors hover:no-underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {name}
              </Link>
            </h3>
          </CardTitle>
          {descriptionText ? (
            <CardDescription className="mt-1 line-clamp-2" dir="auto">
              {descriptionText}
            </CardDescription>
          ) : null}
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
