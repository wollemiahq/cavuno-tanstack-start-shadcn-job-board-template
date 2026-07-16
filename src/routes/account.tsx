/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + experience + education +
 * skills + languages + account delete, each an owned Card section, with a
 * profile-completeness rail (progress + checklist + the resume uploader) on
 * the right. Saved jobs moved to /account/saved; notification settings stay
 * at /settings. The loader's server function enforces auth; the redirect
 * here is UX, not the security boundary.
 */
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  Link,
  redirect,
} from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';

import { AvatarUpload } from '../components/avatar-upload';
import { DangerZone } from '../components/danger-zone';
import { EducationSection } from '../components/education-section';
import { ExperienceSection } from '../components/experience-section';
import { LanguagesSection } from '../components/languages-section';
import { ProfileForm } from '../components/profile-form';
import { SkillsSection } from '../components/skills-section';
import { m } from '../paraglide/messages';
import { getAccount } from '../server/account';
import { useLocationSuggestions } from './-use-location-suggestions';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import {
  ProfileCompletenessCard,
  type ProfileChecklistItem,
} from '@/components/profile-completeness-card';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { candidateLoaderError } from '@/lib/candidate-loader-error';

const rootApi = getRouteApi('__root__');

function AccountPage() {
  const { me, profile, experience, education, skills, languages, resume } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const profileLocationSuggestions = useLocationSuggestions(board.language);
  const experienceLocationSuggestions = useLocationSuggestions(board.language);

  const checklist: ProfileChecklistItem[] = [
    {
      key: 'photo',
      label: m.profileCompleteness_itemPhotoLabel(),
      done: Boolean(profile.avatarUrl),
      href: '#profile',
    },
    {
      key: 'headline',
      label: m.profileForm_headlineLabel(),
      done: Boolean(profile.headline?.trim()),
      href: '#profile',
    },
    {
      key: 'bio',
      label: m.profileForm_bioLabel(),
      done: Boolean(profile.bio?.trim()),
      href: '#profile',
    },
    {
      key: 'location',
      label: m.profileForm_locationLabel(),
      done: Boolean(profile.location?.trim()),
      href: '#profile',
    },
    {
      key: 'resume',
      label: m.resumeUpload_heading(),
      done: resume.hasResumeOnFile,
    },
    {
      key: 'experience',
      label: m.experienceSection_heading(),
      done: experience.data.length > 0,
      href: '#experience',
    },
    {
      key: 'education',
      label: m.educationSection_heading(),
      done: education.data.length > 0,
      href: '#education',
    },
    {
      key: 'skills',
      label: m.skillsSection_heading(),
      done: skills.data.length > 0,
      href: '#skills',
    },
    {
      key: 'languages',
      label: m.languagesSection_heading(),
      done: languages.data.length > 0,
      href: '#languages',
    },
  ];

  return (
    <CandidateShell
      aside={<ProfileCompletenessCard items={checklist} resume={resume} />}
      asideLabel={m.profileCompleteness_regionLabel()}
    >
      <div className="space-y-6">
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
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.accountHome_forEmployersLink()}
                <ChevronDown aria-hidden data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem
                  nativeButton={false}
                  render={<Link to="/employers/dashboard" />}
                >
                  {m.employerDashboard_metaTitle()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link to="/employers/dashboard" search={{ add: true }} />
                  }
                >
                  {m.employerOnboarding_addCompanyLabel()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Card id="profile">
          <CardHeader>
            <CardTitle>
              <h2>{m.accountHome_profileHeading()}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={profile}
              locationSuggestions={profileLocationSuggestions}
            />
          </CardContent>
        </Card>

        <ExperienceSection
          items={experience.data}
          language={board.language}
          locationSuggestions={experienceLocationSuggestions}
        />

        <EducationSection items={education.data} language={board.language} />

        <SkillsSection skills={skills.data.map((skill) => skill.name)} />

        <LanguagesSection
          languages={languages.data.map((language) => ({
            name: language.name,
            proficiency: language.proficiency,
          }))}
        />

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
