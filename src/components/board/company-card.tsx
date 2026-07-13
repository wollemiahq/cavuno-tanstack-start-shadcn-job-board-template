import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "@untitledui/icons";

import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
/**
 * One company as an Untitled UI card row (CAV-487). PURE MARKUP: the
 * companies index, the market-scoped browse, and the similar-companies
 * rail all share this row, so the surface reads as one system (mirrors
 * how every list surface shares `JobCard`).
 *
 * Stock UUI card shape: rounded-xl surface, secondary_alt ring, xs shadow
 * lifting to md on hover — identical to `JobCard`. The company mark falls
 * back to two-letter initials when there is no logo. The open-count Badge
 * is shown ONLY when the company has open roles (an empty company earns no
 * "0 open jobs" noise), and the description line is honestly omitted when
 * absent — the API sends it as (pre-sanitized) HTML, so it is flattened to
 * plain text and clamped rather than rendered as markup inside a card.
 */

/** Two-letter company initials for the avatar fallback (mirrors JobCard). */
function initialsOf(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word[0]!)
            .slice(0, 2)
            .join("")
            .toUpperCase() || undefined
    );
}

/** Flatten the API's (pre-sanitized) description HTML to a trimmed text line. */
function toPlainText(html: string) {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
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
    const descriptionText = description ? toPlainText(description) : "";

    return (
        <article className="group flex h-full flex-col rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt transition duration-100 ease-linear hover:shadow-md">
            <div className="flex items-start gap-3">
                <Avatar size="md" rounded={false} src={logoUrl} initials={initialsOf(name)} alt={name} />
                <div className="min-w-0 flex-1">
                    <h3 className="text-md font-semibold">
                        <Link
                            to="/companies/$companySlug"
                            params={{ companySlug }}
                            className="rounded-xs text-primary outline-focus-ring transition-colors hover:text-brand-secondary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {name}
                        </Link>
                    </h3>
                    {descriptionText ? <p className="mt-1 line-clamp-2 text-sm text-tertiary">{descriptionText}</p> : null}
                </div>
                {/* Decorative directory-card affordance — the real link is the
                    company name; the arrow just signals the card is navigable. */}
                <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg-brand-primary"
                />
            </div>

            {publishedJobCount > 0 ? (
                <div className="mt-4">
                    <Badge type="pill-color" color="brand" size="sm">
                        {jobCountLabel}
                    </Badge>
                </div>
            ) : null}
        </article>
    );
}
