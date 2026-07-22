/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + experience + education +
 * skills + languages, each an owned Card section, with a
 * profile-completeness rail (progress + checklist) on the right and the
 * resume import dialog as the page-header action. Saved jobs moved to
 * /account/saved; notification settings and account deletion live at
 * /settings. The loader's server function enforces auth; the redirect
 * here is UX, not the security boundary.
 */
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
} from '@tanstack/react-router';

import { AvatarUpload } from '../components/avatar-upload';
import { EducationSection } from '../components/education-section';
import { ExperienceSection } from '../components/experience-section';
import { LanguagesSection } from '../components/languages-section';
import { ProfileForm } from '../components/profile-form';
import { ResumeImportDialog } from '../components/resume-import-dialog';
import { SkillsSection } from '../components/skills-section';
import { m } from '../paraglide/messages';
import { getAccount } from '../server/account';
import { getSeoBase } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import {
  CandidateProfilePendingPage,
  CandidateRouteErrorPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import {
  ProfileCompletenessCard,
  type ProfileChecklistItem,
} from '@/components/profile-completeness-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

function AccountPage() {
  const { profile, experience, education, skills, languages, resume } =
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
      title={m.accountHome_title()}
      actions={<ResumeImportDialog resume={resume} />}
      aside={<ProfileCompletenessCard items={checklist} />}
      asideLabel={m.profileCompleteness_regionLabel()}
    >
      <div className="space-y-6">
        <Card id="profile">
          <CardHeader>
            <CardTitle>
              <h2>{m.accountHome_profileHeading()}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AvatarUpload
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
            />
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
      </div>
    </CandidateShell>
  );
}

export const Route = createFileRoute('/account')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateProfilePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      const [account, seo] = await Promise.all([getAccount(), getSeoBase()]);
      return { ...account, seo };
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
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.accountHome_title()) },
      // Private, signed-in surface — keep it out of the index (hosted
      // parity: the hosted board noindexes account/me/messages/settings
      // via meta, and its robots.txt disallows nothing).
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AccountPage,
});
