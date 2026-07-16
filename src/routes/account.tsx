/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + resume + experience +
 * education + skills + languages + account delete. Saved jobs moved to
 * /account/saved; notification settings stay at /settings. The loader's
 * server function enforces auth; the redirect here is UX, not the
 * security boundary.
 */
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
} from '@tanstack/react-router';

import { AvatarUpload } from '../components/avatar-upload';
import { DangerZone } from '../components/danger-zone';
import { EducationSection } from '../components/education-section';
import { ExperienceSection } from '../components/experience-section';
import { LanguagesSection } from '../components/languages-section';
import { ProfileForm } from '../components/profile-form';
import { ResumeUpload } from '../components/resume-upload';
import { SkillsSection } from '../components/skills-section';
import { m } from '../paraglide/messages';
import { getAccount } from '../server/account';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { buttonVariants } from '@/components/ui/button';
import { candidateLoaderError } from '@/lib/candidate-loader-error';

function Divider() {
  return <div className="bg-border h-px w-full" />;
}

function AccountPage() {
  const { me, profile, experience, education, skills, languages, resume } =
    Route.useLoaderData();

  return (
    <CandidateShell>
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarUpload
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
            />
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {profile.displayName ?? me.email}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link
              to="/employers/dashboard"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.accountHome_forEmployersLink()}
            </Link>
          </div>
        </header>

        <Divider />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">
            {m.accountHome_profileHeading()}
          </h2>
          <ProfileForm profile={profile} />
        </section>

        <Divider />
        <ResumeUpload resume={resume} />

        <Divider />
        <ExperienceSection items={experience.data} />

        <Divider />
        <EducationSection items={education.data} />

        <Divider />
        <SkillsSection skills={skills.data.map((skill) => skill.name)} />

        <Divider />
        <LanguagesSection
          languages={languages.data.map((language) => ({
            name: language.name,
            proficiency: language.proficiency,
          }))}
        />

        <Divider />
        <DangerZone />
      </div>
    </CandidateShell>
  );
}

export const Route = createFileRoute('/account')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      return await getAccount();
    } catch (error) {
      // gatedRead's `/password` wall redirect (or any framework redirect) must
      // pass through — only a genuine load failure falls back to sign-in.
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: '/account' },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/account' },
        });
      }
      throw error;
    }
  },
  head: () => ({ meta: [{ title: m.accountHome_title() }] }),
  component: AccountPage,
});
