"use client";

import { Link as AriaLink } from "react-aria-components";

import { cx } from "@/utils/cx";

/**
 * The taxonomy-chip row (CAV-502) — the shared render for the SEO
 * internal-linking spine on job cards, the job-detail page, and company
 * surfaces, in ONE place so every cluster reads as one system.
 *
 * Design note (verified, not assumed): the chips MUST stay real, crawlable
 * `<a href>` anchors — they are the internal-linking spine into the
 * programmatic /jobs/skills|categories pages. The collection's react-aria
 * `Tag`/`TagGroup` renders a `role="grid"` with JS-navigated `data-href`
 * `<div>`s and emits NO anchors, so it would break that spine. So these
 * carry the Tag component's exact visual language (`rounded-md`, inset ring,
 * `bg-primary`/`text-secondary`, per-size padding) on an `AriaLink` that
 * renders a genuine anchor and rides the router seam. The `+N` overflow is
 * an honest, non-link chip so the true taxonomy count is never hidden.
 */
export interface TaxonomyChip {
  key: string;
  name: string;
  href: string;
}

// Mirrors `src/components/base/tags/tags.tsx` (the collection Tag) so the
// chips are visually identical to a stock UUI Tag.
const chipBase =
  "inline-flex items-center gap-0.75 rounded-md bg-primary font-medium text-secondary ring-1 ring-primary ring-inset outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2";

const chipSize = {
  sm: "px-2 py-0.75 text-xs",
  md: "px-2.25 py-0.5 text-sm",
  lg: "px-2.5 py-1 text-sm",
};

export function TaxonomyTags({
  chips,
  overflow = 0,
  size = "md",
}: {
  chips: TaxonomyChip[];
  /** Honest count of chips beyond what the caller sliced in. */
  overflow?: number;
  size?: "sm" | "md" | "lg";
}) {
  if (chips.length === 0 && overflow <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <AriaLink
          key={chip.key}
          href={chip.href}
          className={cx(
            chipBase,
            chipSize[size],
            "cursor-pointer hover:bg-secondary hover:no-underline",
          )}
        >
          {chip.name}
        </AriaLink>
      ))}
      {overflow > 0 ? <span className={cx(chipBase, chipSize[size])}>+{overflow}</span> : null}
    </div>
  );
}
