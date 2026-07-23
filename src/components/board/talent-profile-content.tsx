import type { ElementType } from 'react';

import type { TalentProfileVM } from '@/board/talent-view-model';
// A logo-or-initials brand chip; reused here for education institutions.
import { CompanyAvatar } from '@/components/board/company-avatar';
import { Text } from '@/components/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

/**
 * The talent header block — the avatar + name + headline meta line + the
 * location/availability badge row. Modeled on the job-detail and
 * company-profile headers (`CompanySectionShell`, `JobDetail`): the mark sits
 * left of a stacked name → headline → badges column, so every entity page
 * opens the same way.
 *
 * `size="xl"` drives the full-page hero band (a larger avatar + an `md:text-3xl`
 * title, matching the company/job hero); `size="lg"` is the condensed detail
 * pane. `nameHref` turns the NAME into the link to the canonical `/p/{handle}`
 * profile — the accessible route to the profile now that the "View profile"
 * button is gone. It is left null on the canonical page itself and whenever the
 * surface is a non-interactive placeholder.
 */
export function TalentProfileIdentity({
  vm,
  headingAs = 'h2',
  showName = true,
  size = 'lg',
  nameHref = null,
}: {
  vm: TalentProfileVM;
  headingAs?: 'h1' | 'h2';
  showName?: boolean;
  size?: 'lg' | 'xl';
  nameHref?: string | null;
}) {
  return (
    <header
      data-slot="talent-profile-identity"
      className="flex items-start gap-4"
    >
      <Avatar size={size}>
        {vm.avatarUrl ? (
          <AvatarImage src={vm.avatarUrl} alt={vm.avatarName} />
        ) : null}
        <AvatarFallback>{initialsOf(vm.avatarName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-2">
        {showName || vm.headline ? (
          <div className="flex min-w-0 flex-col gap-1">
            {showName ? (
              <Text
                as={headingAs}
                variant="heading2"
                className={size === 'xl' ? 'md:text-3xl' : undefined}
                dir="auto"
              >
                {nameHref ? (
                  <a
                    href={nameHref}
                    className="outline-none hover:underline focus-visible:underline"
                  >
                    {vm.displayName}
                  </a>
                ) : (
                  vm.displayName
                )}
              </Text>
            ) : null}
            {vm.headline ? (
              <p className="text-muted-foreground text-base" dir="auto">
                {vm.headline}
              </p>
            ) : null}
          </div>
        ) : null}

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
      </div>
    </header>
  );
}

export function TalentProfileContent({
  vm,
  headingAs = 'h2',
  interactive = true,
  showName = true,
  showHeader = true,
}: {
  vm: TalentProfileVM;
  headingAs?: 'h1' | 'h2';
  interactive?: boolean;
  showName?: boolean;
  showHeader?: boolean;
}) {
  const SectionHeading = (headingAs === 'h1' ? 'h2' : 'h3') as ElementType;

  return (
    <div className="space-y-8">
      {showHeader ? (
        <TalentProfileIdentity
          vm={vm}
          headingAs={headingAs}
          showName={showName}
        />
      ) : null}

      {vm.bio ? (
        <p
          className="text-foreground text-sm leading-6 whitespace-pre-line"
          dir="auto"
        >
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
                className="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <CompanyAvatar
                  name={experience.companyName}
                  logoUrl={experience.companyLogoUrl}
                  size="lg"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-3">
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
                    <p
                      className="text-foreground text-sm leading-6 whitespace-pre-line"
                      dir="auto"
                    >
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
                </div>
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
                className="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <CompanyAvatar
                  name={education.institutionName}
                  logoUrl={education.institutionLogoUrl}
                  size="lg"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-2">
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
                    <p
                      className="text-foreground text-sm leading-6 whitespace-pre-line"
                      dir="auto"
                    >
                      {education.description}
                    </p>
                  ) : null}
                </div>
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
