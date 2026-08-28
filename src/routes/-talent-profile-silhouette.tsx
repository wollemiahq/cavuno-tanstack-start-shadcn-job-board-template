import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { m } from '@/paraglide/messages';
import type { TalentProfile } from '@cavuno/board';

/**
 * The shape of a paywalled profile, without its content.
 *
 * The API blanks every text field before it reaches us but keeps the rows and
 * their logos, so this renders one bar per real role and degree. That is the
 * whole point of the gate: an employer spends a credit because they can see
 * there are five roles and two degrees behind it, not because a padlock told
 * them nothing. Same reason LinkedIn shows a logged-out visitor the silhouette
 * of a profile rather than an empty page.
 *
 * Presentational only, and `aria-hidden` because a screen reader announcing a
 * dozen empty bars would be noise — the upsell card above carries the meaning.
 */
function Bar({ className }: { className?: string }) {
  return <div className={`bg-muted rounded ${className ?? ''}`} />;
}

function SilhouetteRow({ logoUrl }: { logoUrl: string | null }) {
  return (
    <li className="flex items-start gap-3">
      <Avatar className="size-9 shrink-0 rounded-md">
        {logoUrl ? <AvatarImage src={logoUrl} alt="" /> : null}
        <AvatarFallback className="rounded-md" />
      </Avatar>
      <div className="flex-1 space-y-1.5 py-0.5">
        <Bar className="h-3 w-2/5" />
        <Bar className="h-2.5 w-1/4" />
      </div>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-foreground text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function TalentProfileSilhouette({
  profile,
}: {
  profile: Pick<
    TalentProfile,
    'experiences' | 'education' | 'skills' | 'languages'
  >;
}) {
  const { experiences, education, skills, languages } = profile;
  if (
    experiences.length === 0 &&
    education.length === 0 &&
    skills.length === 0 &&
    languages.length === 0
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none space-y-8 opacity-70 blur-[2px] select-none"
    >
      {experiences.length > 0 ? (
        <Section title={m.publicProfile_experienceHeading()}>
          <ul className="space-y-4">
            {experiences.map((experience, index) => (
              <SilhouetteRow
                key={`experience-${index}`}
                logoUrl={experience.companyLogoUrl}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {education.length > 0 ? (
        <Section title={m.publicProfile_educationHeading()}>
          <ul className="space-y-4">
            {education.map((entry, index) => (
              <SilhouetteRow
                key={`education-${index}`}
                logoUrl={entry.institutionLogoUrl}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {skills.length > 0 ? (
        <Section title={m.publicProfile_skillsHeading()}>
          <div className="flex flex-wrap gap-2">
            {skills.map((_, index) => (
              <Bar key={`skill-${index}`} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </Section>
      ) : null}

      {languages.length > 0 ? (
        <Section title={m.publicProfile_languagesHeading()}>
          <div className="flex flex-wrap gap-2">
            {languages.map((_, index) => (
              <Bar
                key={`language-${index}`}
                className="h-6 w-24 rounded-full"
              />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
