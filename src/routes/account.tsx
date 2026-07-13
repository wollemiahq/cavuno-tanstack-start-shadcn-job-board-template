/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + resume + experience +
 * education + skills + languages + account delete. Saved jobs moved to
 * /account/saved; notification settings stay at /settings. The loader's
 * server function enforces auth; the redirect here is UX, not the
 * security boundary.
 */
import { Text } from "@/components/text"
import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import { CandidateShell } from '@/components/account-shell'
import { AvatarUpload } from '../components/avatar-upload'
import { DangerZone } from '../components/danger-zone'
import { EducationSection } from '../components/education-section'
import { ExperienceSection } from '../components/experience-section'
import { LanguagesSection } from '../components/languages-section'
import { ProfileForm } from '../components/profile-form'
import { ResumeUpload } from '../components/resume-upload'
import { SkillsSection } from '../components/skills-section'
import { m } from '../paraglide/messages'
import { getAccount } from '../server/account'
import { signOut } from '../server/auth'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'

function Divider() {
  return <div className="h-px w-full bg-border" />
}

function isEmailUnverified(error: unknown) {
  return String(error).includes('EMAIL_UNVERIFIED')
}

export const Route = createFileRoute('/account')({
  loader: async () => {
    try {
      return await getAccount()
    } catch (error) {
      // gatedRead's `/password` wall redirect (or any framework redirect) must
      // pass through — only a genuine load failure falls back to sign-in.
      if (isRedirect(error)) throw error
      if (isEmailUnverified(error)) {
        throw redirect({ to: '/auth/verify-email-required' })
      }
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.accountHome_title() }] }),
  component: AccountPage,
})

/** Simple presence-based completeness for the rail meter. */
function profileStrength(data: {
  displayName: string | null
  avatarUrl: string | null
  hasResume: boolean
  experienceCount: number
  educationCount: number
  skillsCount: number
}) {
  const checks = [
    Boolean(data.displayName),
    Boolean(data.avatarUrl),
    data.hasResume,
    data.experienceCount > 0,
    data.educationCount > 0,
    data.skillsCount > 0,
  ]
  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  )
}

function StrengthMeter({ percent }: { percent: number }) {
  return (
    <div className="mt-6 hidden md:block">
      <div className="border-t border-secondary pt-5">
        <p className="text-tertiary text-xs font-semibold tracking-wide uppercase">
          {m.accountShell_profileStrengthLabel()}
        </p>
        <p className="text-primary mt-1 text-sm font-medium">{percent}%</p>
        <div className="bg-secondary mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary-solid h-full rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function AccountPage() {
  const {
    me,
    profile,
    experience,
    education,
    skills,
    languages,
    resume,
  } = Route.useLoaderData()
  const router = useRouter()
  const percent = profileStrength({
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    hasResume: Boolean(resume),
    experienceCount: experience.data.length,
    educationCount: education.data.length,
    skillsCount: skills.data.length,
  })

  return (
    <CandidateShell
      active="profile"
      identity={{
        avatarUrl: profile.avatarUrl,
        title: profile.displayName ?? me.email,
        subtitle: me.email,
        badge: me.emailVerified ? (
          <Badge color="gray">{m.accountHome_verifiedBadge()}</Badge>
        ) : (
          <Badge color="gray" type="modern">{m.accountHome_unverifiedBadge()}</Badge>
        ),
      }}
      rail={<StrengthMeter percent={percent} />}
    >
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarUpload
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
            />
            <Text as="h1" variant="heading1">
              {profile.displayName ?? me.email}
            </Text>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button href="/employers/dashboard" color="secondary">
              {m.accountHome_forEmployersLink()}
            </Button>
            <Button
              color="secondary"
              onClick={async () => {
                await signOut()
                await router.invalidate()
                await router.navigate({ to: '/' })
              }}
            >
              {m.accountHome_signOutLabel()}
            </Button>
          </div>
        </header>

        <Divider />

        <section className="space-y-4">
          <Text as="h2" variant="heading4">{m.accountHome_profileHeading()}</Text>
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
  )
}
