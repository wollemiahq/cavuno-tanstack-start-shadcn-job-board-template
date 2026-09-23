/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + experience + education +
 * skills + languages, each an owned Card section, with a
 * profile-completeness rail (progress + checklist) on the right and the
 * resume import dialog as the page-header action. Saved jobs live at
 * /saved-jobs; notification settings and account deletion live at
 * /settings. The loader's server function enforces auth; the redirect
 * here is UX, not the security boundary.
 */
import { Fragment, type ReactNode } from 'react';

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
import {
  ProfileForm,
  resolveTalentForm,
  type TalentSectionKey,
} from '../components/profile-form';
import { ResumeImportDialog } from '../components/resume-import-dialog';
import { SkillsSection } from '../components/skills-section';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getAccount } from '../server/account';
import { getSeoBase } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import { boardForms } from '@/board/form-layout';
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
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

const SECTION_KEYS: readonly TalentSectionKey[] = [
  'experience',
  'education',
  'skills',
  'languages',
];

function AccountPage() {
  const {
    profile,
    experience,
    education,
    skills,
    languages,
    resume,
    customFields,
    objectReferences,
  } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const profileLocationSuggestions = useLocationSuggestions(getLocale());
  const experienceLocationSuggestions = useLocationSuggestions(getLocale());

  // The operator's talent form: which fields show, which are required, and
  // the order of the profile sections below the profile card. Without a
  // layout (an older API) the page keeps its pre-layout order.
  const profileFields = { customFields, objectReferences };
  const entries = resolveTalentForm(
    boardForms(board)?.talent ?? null,
    profileFields,
  );
  const shown = new Set<string>(
    entries.flatMap((entry) => (entry.kind === 'builtin' ? [entry.key] : [])),
  );
  const sectionCounts = {
    experience: experience.data.length,
    education: education.data.length,
    skills: skills.data.length,
    languages: languages.data.length,
  } satisfies Record<TalentSectionKey, number>;
  const sections = {
    experience: (
      <ExperienceSection
        items={experience.data}
        language={getLocale()}
        locationSuggestions={experienceLocationSuggestions}
      />
    ),
    education: (
      <EducationSection items={education.data} language={getLocale()} />
    ),
    skills: <SkillsSection skills={skills.data.map((skill) => skill.name)} />,
    languages: (
      <LanguagesSection
        languages={languages.data.map((language) => ({
          name: language.name,
          proficiency: language.proficiency,
        }))}
      />
    ),
  } satisfies Record<TalentSectionKey, ReactNode>;
  const sectionOrder = entries.flatMap((entry) =>
    entry.kind === 'builtin'
      ? SECTION_KEYS.filter((key) => key === entry.key)
      : [],
  );

  const allChecklist: ProfileChecklistItem[] = [
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
  // A hidden field has nothing to complete. The checklist keys are the
  // layout keys, except the photo (`avatar`) and the resume (not a layout
  // field, so always listed).
  const checklist = allChecklist.filter(
    (item) =>
      item.key === 'resume' ||
      shown.has(item.key === 'photo' ? 'avatar' : item.key),
  );

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
            {shown.has('avatar') ? (
              <AvatarUpload
                avatarUrl={profile.avatarUrl}
                displayName={profile.displayName}
              />
            ) : null}
            <ProfileForm
              profile={profile}
              locationSuggestions={profileLocationSuggestions}
              language={getLocale()}
              entries={entries}
              profileFields={profileFields}
              sectionCounts={sectionCounts}
            />
          </CardContent>
        </Card>

        {sectionOrder.map((key) => (
          <Fragment key={key}>{sections[key]}</Fragment>
        ))}
      </div>
    </CandidateShell>
  );
}

export const Route = createFileRoute('/account')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateProfilePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async ({ location }) => {
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
          search: mergeAuthConversionSearch(
            { returnTo: '/account' },
            incomingAuthSearch(location),
          ),
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
