import { Link } from '@tanstack/react-router';

import { initialsOf } from '../lib/initials';
import { m } from '../paraglide/messages';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { clampList } from '@/lib/clamp-list';
import type { TalentDirectoryEntry } from '@cavuno/board';

/**
 * One candidate as a talent-directory card. PURE MARKUP shared by the
 * `/talent` directory grid and the home landing's "Featured talent" strip,
 * so the two surfaces read as one system (mirrors how `JobCard` /
 * `CompanyCard` / `PostCard` are shared). The avatar falls back to two-letter
 * initials; location, headline, and skills are honestly omitted when absent.
 */
const MAX_SKILL_TAGS = 4;

export function TalentCard({ candidate }: { candidate: TalentDirectoryEntry }) {
  const displayName =
    candidate.displayName ?? m.talentDirectory_candidateFallbackLabel();
  // Skills are plain strings (no hrefs), so the overflow chip is a Badge
  // rather than the taxonomy "+K" anchor treatment JobCard uses.
  const { visible: visibleSkills, overflow: hiddenSkillCount } = clampList(
    candidate.skills,
    MAX_SKILL_TAGS,
  );

  return (
    <Card role="article" className="relative h-full">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {candidate.avatarUrl ? (
              <AvatarImage src={candidate.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {candidate.handle ? (
              <Link
                to="/p/$handle"
                params={{ handle: candidate.handle }}
                className="text-foreground font-semibold outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:no-underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
            {candidate.location ? (
              <p className="text-muted-foreground text-sm">
                {candidate.location}
              </p>
            ) : null}
          </div>
        </div>
        {candidate.headline ? (
          <p className="text-muted-foreground text-sm">{candidate.headline}</p>
        ) : null}
        {candidate.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
            {hiddenSkillCount > 0 ? (
              <Badge variant="secondary">+{hiddenSkillCount}</Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
