/**
 * Account — the candidate Profile tab in the sidebar shell (Paper
 * "Candidate — Sidebar"): profile + avatar + resume + experience +
 * education + skills + languages + account delete. Saved jobs moved to
 * /account/saved; notification settings stay at /settings. The loader's
 * server function enforces auth; the redirect here is UX, not the
 * security boundary.
 */
import { createFileRoute, isRedirect, Link, redirect, useRouter } from "@tanstack/react-router";

import { CandidateShell } from "@/components/candidate-shell";
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from "@/components/candidate-route-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { candidateLoaderError } from "@/lib/candidate-loader-error";
import { AvatarUpload } from "../components/avatar-upload";
import { DangerZone } from "../components/danger-zone";
import { EducationSection } from "../components/education-section";
import { ExperienceSection } from "../components/experience-section";
import { LanguagesSection } from "../components/languages-section";
import { ProfileForm } from "../components/profile-form";
import { ResumeUpload } from "../components/resume-upload";
import { SkillsSection } from "../components/skills-section";
import { m } from "../paraglide/messages";
import { getAccount } from "../server/account";
import { signOut } from "../server/auth";
import { useCandidateShellContext } from "./-candidate-shell-context";

function Divider() {
  return <div className="h-px w-full bg-border" />;
}

export const Route = createFileRoute("/account")({
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
      if (authFailure === "email-unverified") {
        throw redirect({
          to: "/auth/verify-email-required",
          search: { returnTo: "/account" },
        });
      }
      if (authFailure === "unauthenticated") {
        throw redirect({ to: "/auth/sign-in", search: { returnTo: "/account" } });
      }
      throw error;
    }
  },
  head: () => ({ meta: [{ title: m.accountHome_title() }] }),
  component: AccountPage,
});

/** Simple presence-based completeness for the rail meter. */
function profileStrength(data: {
  displayName: string | null;
  avatarUrl: string | null;
  hasResume: boolean;
  experienceCount: number;
  educationCount: number;
  skillsCount: number;
}) {
  const checks = [
    Boolean(data.displayName),
    Boolean(data.avatarUrl),
    data.hasResume,
    data.experienceCount > 0,
    data.educationCount > 0,
    data.skillsCount > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function StrengthMeter({ percent }: { percent: number }) {
  return (
    <div className="mt-6 hidden md:block">
      <div className="border-t border-secondary pt-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {m.accountShell_profileStrengthLabel()}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{percent}%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function AccountPage() {
  const { me, profile, experience, education, skills, languages, resume } = Route.useLoaderData();
  const candidateShell = useCandidateShellContext();
  const router = useRouter();
  const percent = profileStrength({
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    hasResume: Boolean(resume),
    experienceCount: experience.data.length,
    educationCount: education.data.length,
    skillsCount: skills.data.length,
  });

  return (
    <CandidateShell
      active="profile"
      {...candidateShell}
      identity={{
        avatarUrl: profile.avatarUrl,
        title: profile.displayName ?? me.email,
        subtitle: me.email,
        badge: me.emailVerified ? (
          <Badge variant="secondary">{m.accountHome_verifiedBadge()}</Badge>
        ) : (
          <Badge variant="outline">{m.accountHome_unverifiedBadge()}</Badge>
        ),
      }}
      rail={<StrengthMeter percent={percent} />}
    >
      <div className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarUpload avatarUrl={profile.avatarUrl} displayName={profile.displayName} />
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {profile.displayName ?? me.email}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link to="/employers/dashboard" className={buttonVariants({ variant: "outline" })}>
              {m.accountHome_forEmployersLink()}
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                await router.invalidate();
                await router.navigate({ to: "/" });
              }}
            >
              {m.accountHome_signOutLabel()}
            </Button>
          </div>
        </header>

        <Divider />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">{m.accountHome_profileHeading()}</h2>
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
