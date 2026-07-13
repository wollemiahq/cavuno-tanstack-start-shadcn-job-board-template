import { Link } from "@tanstack/react-router";

import type { TalentDirectoryEntry } from "@cavuno/board";

import { Avatar } from "@/components/base/avatar/avatar";
import { initialsOf } from "../lib/initials";
import { m } from "../paraglide/messages";

/**
 * One candidate as a talent-directory card. PURE MARKUP shared by the
 * `/talent` directory grid and the home landing's "Featured talent" strip,
 * so the two surfaces read as one system (mirrors how `JobCard` /
 * `CompanyCard` / `PostCard` are shared). The avatar falls back to two-letter
 * initials; location, headline, and skills are honestly omitted when absent.
 */
export function TalentCard({ candidate }: { candidate: TalentDirectoryEntry }) {
  return (
    <div className="border-secondary bg-primary space-y-3 rounded-xl border p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <Avatar
          size="md"
          src={candidate.avatarUrl}
          initials={initialsOf(candidate.displayName ?? "")}
          alt={candidate.displayName ?? ""}
        />
        <div className="min-w-0">
          {candidate.handle ? (
            <Link
              to="/p/$handle"
              params={{ handle: candidate.handle }}
              className="font-semibold hover:no-underline"
            >
              {candidate.displayName ?? m.talentDirectory_candidateFallbackLabel()}
            </Link>
          ) : (
            <span className="font-semibold">
              {candidate.displayName ?? m.talentDirectory_candidateFallbackLabel()}
            </span>
          )}
          {candidate.location ? (
            <p className="font-mono text-quaternary text-[13px]">{candidate.location}</p>
          ) : null}
        </div>
      </div>
      {candidate.headline ? (
        <p className="text-tertiary text-sm">{candidate.headline}</p>
      ) : null}
      {candidate.skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="font-mono border-secondary text-tertiary bg-primary rounded-md border px-2 py-0.5 text-[11.5px]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
