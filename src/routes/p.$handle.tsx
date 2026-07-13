import { Text } from "@/components/text"
import { createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";

import { JsonLd } from "@/components/json-ld";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";

import { initialsOf } from "../lib/initials";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, getTalentProfile } from "../server/queries";

export const Route = createFileRoute("/p/$handle")({
  loader: async ({ params }) => {
    try {
      const [profile, seo] = await Promise.all([
        getTalentProfile({ data: { handle: params.handle } }),
        getSeoBase(),
      ]);
      return { profile, seo };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.publicProfile_pageTitle({
                name: loaderData.profile.displayName ?? m.publicProfile_profileFallbackLabel(),
                boardName: loaderData.seo.boardName,
              }),
            },
            ...(loaderData.profile.headline
              ? [{ name: "description", content: loaderData.profile.headline }]
              : []),
          ],
          links: [
            {
              rel: "canonical",
              href: `${loaderData.seo.origin}/p/${loaderData.profile.handle}`,
            },
          ],
        }
      : {},
  component: TalentProfilePage,
  notFoundComponent: () => (
    <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
      {m.publicProfile_notFoundText()}
    </p>
  ),
});

/** `2022-01` → `Jan 2022`; `null` end → `Present`. */
function formatMonth(value: string | null): string {
  if (!value) return m.publicProfile_presentLabel();
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en", { month: "short", year: "numeric" });
}

function TalentProfilePage() {
  const { profile, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;

  const canonical = `${seo.origin}/p/${profile.handle}`;
  // ProfilePage + Person + BreadcrumbList — starter-authored per ADR-0039 (the
  // hosted profile page emits no structured data; this is additive).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: canonical,
      mainEntity: {
        "@type": "Person",
        "@id": `${canonical}#person`,
        ...(profile.displayName ? { name: profile.displayName } : {}),
        ...(profile.headline ? { jobTitle: profile.headline } : {}),
        ...(profile.bio ? { description: profile.bio } : {}),
        ...(profile.location ? { homeLocation: profile.location } : {}),
        ...(profile.skills.length > 0 ? { knowsAbout: profile.skills.map((s) => s.name) } : {}),
      },
    },
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.talent, href: `${seo.origin}/talent` },
      {
        label: profile.displayName ?? profile.handle ?? m.publicProfile_profileFallbackLabel(),
      },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <div className="space-y-6">
      <JsonLd data={jsonLd} />

      <header className="flex items-start gap-4">
        <Avatar
          size="2xl"
          src={profile.avatarUrl}
          initials={initialsOf(profile.displayName ?? "")}
          alt={profile.displayName ?? ""}
        />
        <div className="min-w-0">
          <Text as="h1" variant="heading1">
            {profile.displayName ?? m.publicProfile_anonymousCandidateLabel()}
          </Text>
          {profile.headline ? <p className="text-tertiary">{profile.headline}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tertiary">
            {profile.location ? <span>{profile.location}</span> : null}
            {profile.jobSearchStatus ? (
              <Badge size="sm" type="pill-color" color="brand">{profile.jobSearchStatus.replace(/_/g, " ")}</Badge>
            ) : null}
          </div>
        </div>
      </header>

      {profile.bio ? (
        <p className="whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p>
      ) : null}

      {profile.experiences.length > 0 ? (
        <>
          <hr className="border-secondary" />
          <section className="space-y-4">
            <Text as="h2" variant="heading4">{m.publicProfile_experienceHeading()}</Text>
            {profile.experiences.map((exp, i) => (
              <div key={i} className="space-y-1">
                <p className="font-medium">
                  {exp.title}
                  {exp.companyName ? (
                    <span className="text-tertiary"> · {exp.companyName}</span>
                  ) : null}
                </p>
                <p className="text-sm text-tertiary">
                  {formatMonth(exp.startDate)} – {formatMonth(exp.endDate)}
                  {exp.location ? ` · ${exp.location}` : ""}
                  {exp.employmentType ? ` · ${exp.employmentType.replace(/_/g, " ")}` : ""}
                </p>
                {exp.description ? (
                  <p className="whitespace-pre-line text-sm">{exp.description}</p>
                ) : null}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {profile.education.length > 0 ? (
        <>
          <hr className="border-secondary" />
          <section className="space-y-4">
            <Text as="h2" variant="heading4">{m.publicProfile_educationHeading()}</Text>
            {profile.education.map((edu, i) => (
              <div key={i} className="space-y-1">
                <p className="font-medium">{edu.institutionName}</p>
                <p className="text-sm text-tertiary">
                  {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  {edu.startDate || edu.endDate
                    ? ` · ${formatMonth(edu.startDate)} – ${formatMonth(edu.endDate)}`
                    : ""}
                </p>
                {edu.description ? (
                  <p className="whitespace-pre-line text-sm">{edu.description}</p>
                ) : null}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {profile.skills.length > 0 ? (
        <>
          <hr className="border-secondary" />
          <section className="space-y-3">
            <Text as="h2" variant="heading4">{m.publicProfile_skillsHeading()}</Text>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill.name} size="sm" type="pill-color" color="gray">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {profile.languages.length > 0 ? (
        <>
          <hr className="border-secondary" />
          <section className="space-y-3">
            <Text as="h2" variant="heading4">{m.publicProfile_languagesHeading()}</Text>
            <ul className="space-y-1 text-sm">
              {profile.languages.map((lang) => (
                <li key={lang.name}>
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-tertiary">
                    {" "}
                    — {lang.proficiency.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
