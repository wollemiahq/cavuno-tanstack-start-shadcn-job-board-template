import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { initialsOf } from '@/lib/initials';
/**
 * One company as an owned shadcn card row (CAV-487). PURE MARKUP: the
 * companies index, the market-scoped browse, and the similar-companies
 * rail all share this row, so the surface reads as one system (mirrors
 * how every list surface shares `JobCard`).
 *
 * The owned Card supplies the shared radius, ring, and shadow, lifting on
 * hover like `JobCard`. The company mark falls
 * back to two-letter initials when there is no logo. The open-count Badge
 * is shown ONLY when the company has open roles (an empty company earns no
 * "0 open jobs" noise), and the description line is honestly omitted when
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
  /** Pre-resolved, pluralized "N open job(s)" label from the route. */
  jobCountLabel: string;
}) {
  const descriptionText = description ? toPlainText(description) : '';

  return (
    <Card
      role="article"
      className="h-full gap-4 transition-shadow hover:shadow-md"
    >
      <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3">
        <Avatar size="lg" className="rounded-xl after:rounded-xl">
          {logoUrl ? (
            <AvatarImage src={logoUrl} alt={name} className="rounded-xl" />
          ) : null}
          <AvatarFallback className="rounded-xl">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <CardTitle>
            <h3>
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
            <CardDescription className="mt-1 line-clamp-2">
              {descriptionText}
            </CardDescription>
          ) : null}
        </div>
        {/* Decorative directory-card affordance — the real link is the
                    company name; the arrow just signals the card is navigable. */}
        <CardAction className="col-start-3">
          <ArrowUpRight
            aria-hidden="true"
            className="text-muted-foreground group-hover/card:text-primary size-5 shrink-0 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
          />
        </CardAction>
      </CardHeader>

      {publishedJobCount > 0 ? (
        <CardFooter>
          <Badge variant="secondary">{jobCountLabel}</Badge>
        </CardFooter>
      ) : null}
    </Card>
  );
}
