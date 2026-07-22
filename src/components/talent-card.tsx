import { Link } from '@tanstack/react-router';

import { initialsOf } from '../lib/initials';
import { m } from '../paraglide/messages';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { clampList } from '@/lib/clamp-list';
import type { TalentDirectoryEntry } from '@cavuno/board';

/**
 * One candidate as a talent-directory card. PURE MARKUP shared by the
 * `/talent` directory grid and the home landing's "Featured talent" strip,
 * so the two surfaces read as one system (mirrors how `JobCard` /
 * `CompanyCard` / `PostCard` are shared). Standard card anatomy: the name is
 * the CardTitle (a stretched link to the profile when the candidate has a
 * handle), location is the CardDescription, and the card lifts on hover like
 * its siblings. The avatar falls back to two-letter initials; location,
 * headline, and skills are honestly omitted when absent.
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
  const name = candidate.handle ? (
    <Link
      to="/p/$handle"
      params={{ handle: candidate.handle }}
      className="focus-visible:ring-ring/50 rounded-sm outline-none after:absolute after:inset-0 after:z-(--z-card-overlay) after:rounded-[inherit] hover:underline focus-visible:ring-2"
    >
      {displayName}
    </Link>
  ) : (
    displayName
  );

  return (
    <Card
      role="article"
      className="relative h-full transition-shadow hover:shadow-md"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {candidate.avatarUrl ? (
              <AvatarImage src={candidate.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle>
              <h3 className="truncate text-balance">{name}</h3>
            </CardTitle>
            {candidate.location ? (
              <CardDescription>{candidate.location}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {candidate.headline ? (
        <CardContent>
          <p className="text-muted-foreground text-sm">{candidate.headline}</p>
        </CardContent>
      ) : null}
      {candidate.skills.length > 0 ? (
        <CardFooter className="mt-auto flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
          {hiddenSkillCount > 0 ? (
            <Badge variant="secondary">+{hiddenSkillCount}</Badge>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
