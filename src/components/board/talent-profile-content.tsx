import type { ElementType } from 'react';

import type { TalentProfileVM } from '@/board/talent-view-model';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';

function ProfileLink({
  href,
  children,
  interactive,
}: {
  href: string | null;
  children: React.ReactNode;
  interactive: boolean;
}) {
  return href && interactive ? (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium">
      {children}
    </a>
  ) : (
    <span className="font-medium">{children}</span>
  );
}

export function TalentProfileContent({
  vm,
  headingAs = 'h2',
  interactive = true,
  showName = true,
}: {
  vm: TalentProfileVM;
  headingAs?: 'h1' | 'h2';
  interactive?: boolean;
  showName?: boolean;
}) {
  const Heading = headingAs as ElementType;
  const SectionHeading = (headingAs === 'h1' ? 'h2' : 'h3') as ElementType;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {vm.avatarUrl ? (
              <img
                src={vm.avatarUrl}
                alt={vm.avatarName}
                className="aspect-square size-full rounded-full object-cover"
              />
            ) : null}
            <AvatarFallback>{initialsOf(vm.avatarName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {showName ? (
              <Heading className="text-foreground text-2xl font-semibold tracking-tight">
                {vm.displayName}
              </Heading>
            ) : null}
            {vm.headline ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {vm.headline}
              </p>
            ) : null}
          </div>
        </div>

        {vm.location || vm.jobSearchStatusLabel ? (
          <div className="flex flex-wrap gap-1.5">
            {vm.location ? (
              <Badge variant="outline">{vm.location}</Badge>
            ) : null}
            {vm.jobSearchStatusLabel ? (
              <Badge variant="secondary">{vm.jobSearchStatusLabel}</Badge>
            ) : null}
          </div>
        ) : null}
      </header>

      {vm.bio ? (
        <p className="text-foreground text-sm leading-6 whitespace-pre-line">
          {vm.bio}
        </p>
      ) : null}

      {vm.experiences.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading className="text-foreground text-lg font-semibold">
            {vm.experienceHeading}
          </SectionHeading>
          <div className="divide-border divide-y">
            {vm.experiences.map((experience) => (
              <article
                key={experience.key}
                className="space-y-3 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <h4 className="text-foreground font-semibold">
                    {experience.title}
                  </h4>
                  <ProfileLink
                    href={experience.companyHref}
                    interactive={interactive}
                  >
                    {experience.companyName}
                  </ProfileLink>
                </div>
                {experience.dateRangeLabel ? (
                  <p className="text-muted-foreground text-sm">
                    {experience.dateRangeLabel}
                  </p>
                ) : null}
                {experience.location ||
                experience.employmentTypeLabel ||
                experience.locationTypeLabel ||
                experience.foundViaLabel ? (
                  <div className="flex flex-wrap gap-1.5">
                    {experience.location ? (
                      <Badge variant="outline">{experience.location}</Badge>
                    ) : null}
                    {experience.employmentTypeLabel ? (
                      <Badge variant="outline">
                        {experience.employmentTypeLabel}
                      </Badge>
                    ) : null}
                    {experience.locationTypeLabel ? (
                      <Badge variant="outline">
                        {experience.locationTypeLabel}
                      </Badge>
                    ) : null}
                    {experience.foundViaLabel ? (
                      <Badge variant="outline">
                        {experience.foundViaLabel}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {experience.description ? (
                  <p className="text-foreground text-sm leading-6 whitespace-pre-line">
                    {experience.description}
                  </p>
                ) : null}
                {experience.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {experience.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {vm.education.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading className="text-foreground text-lg font-semibold">
            {vm.educationHeading}
          </SectionHeading>
          <div className="divide-border divide-y">
            {vm.education.map((education) => (
              <article
                key={education.key}
                className="space-y-2 py-4 first:pt-0 last:pb-0"
              >
                <ProfileLink
                  href={education.institutionHref}
                  interactive={interactive}
                >
                  {education.institutionName}
                </ProfileLink>
                {education.qualificationLabel ? (
                  <p className="text-foreground font-medium">
                    {education.qualificationLabel}
                  </p>
                ) : null}
                {education.dateRangeLabel ? (
                  <p className="text-muted-foreground text-sm">
                    {education.dateRangeLabel}
                  </p>
                ) : null}
                {education.grade ? (
                  <p className="text-foreground text-sm">{education.grade}</p>
                ) : null}
                {education.activitiesAndSocieties ? (
                  <p className="text-foreground text-sm">
                    {education.activitiesAndSocieties}
                  </p>
                ) : null}
                {education.description ? (
                  <p className="text-foreground text-sm leading-6 whitespace-pre-line">
                    {education.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {vm.skills.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading className="text-foreground text-lg font-semibold">
            {vm.skillsHeading}
          </SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {vm.skills.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {vm.languages.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading className="text-foreground text-lg font-semibold">
            {vm.languagesHeading}
          </SectionHeading>
          <dl className="space-y-2">
            {vm.languages.map((language) => (
              <div
                key={language.key}
                className="flex items-baseline justify-between gap-4"
              >
                <dt className="text-foreground font-medium">{language.name}</dt>
                {language.proficiencyLabel ? (
                  <dd className="text-muted-foreground text-sm">
                    {language.proficiencyLabel}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
