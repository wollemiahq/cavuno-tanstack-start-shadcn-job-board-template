import { useState } from "react";

import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/base/buttons/button";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { cx } from "@/utils/cx";
import { m } from "../paraglide/messages";
import { AuthCard } from "../components/auth-form";
import { resolveSignupDestination } from "../lib/signup-destination";
import { getBoardContext, getSeoBase } from "../server/queries";

// Role-picker funnel (CAV-514). Mirrors the hosted /auth/join role split off
// board-context features — no new API. The same pure `resolveSignupDestination`
// helper that points the header's Sign up button here decides the loader too,
// so the two stay in lock-step: a single-role board 302s straight to that
// form (never showing a one-choice picker), neither-role 404s (the header
// hides the entry point entirely there), and only a both-roles board renders
// the chooser below.
export const Route = createFileRoute("/auth/join")({
  loader: async () => {
    const board = await getBoardContext();
    const destination = resolveSignupDestination(board.features);
    if (destination === null) throw notFound();
    if (destination !== "/auth/join") throw redirect({ href: destination });
    const seo = await getSeoBase();
    return { boardName: board.name, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [{ title: m.authJoin_title() }],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}/auth/join` }],
        }
      : { meta: [{ title: m.authJoin_title() }] },
  component: JoinPage,
  notFoundComponent: () => (
    <p className="rounded-lg border border-dashed border-secondary p-10 text-center text-tertiary">
      {m.authJoin_notAvailableText()}
    </p>
  ),
});

function JoinPage() {
  const { boardName, seo } = Route.useLoaderData();
  const [role, setRole] = useState("candidate");
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: m.breadcrumbJsonLd_joinLabel() },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const destination = role === "employer" ? "/auth/employer/sign-up" : "/auth/sign-up";

  return (
    <AuthCard title={m.authJoin_heading({ boardName })} supportingText={m.authJoin_subheading()}>
      <JsonLd data={jsonLd} />
      <RadioGroup
        value={role}
        onChange={setRole}
        size="md"
        aria-label={m.authJoin_subheading()}
        className="gap-3"
      >
        <RoleCard
          value="candidate"
          title={m.authJoin_candidateCardTitle()}
          body={m.authJoin_candidateCardBody()}
        />
        <RoleCard
          value="employer"
          title={m.authJoin_employerCardTitle()}
          body={m.authJoin_employerCardBody()}
        />
      </RadioGroup>
      <Button color="primary" size="lg" className="w-full" href={destination}>
        {m.authJoin_continueLabel()}
      </Button>
      <p className="text-center text-sm text-tertiary">
        {m.authJoin_alreadyHaveAccountText()}{" "}
        <Button color="link-color" size="sm" href="/auth/sign-in">
          {m.authJoin_logInLink()}
        </Button>
      </p>
    </AuthCard>
  );
}

/** One selectable role as an Untitled UI radio-button card. */
function RoleCard({ value, title, body }: { value: string; title: string; body: string }) {
  return (
    <RadioButton
      value={value}
      label={title}
      hint={body}
      className={({ isSelected, isFocusVisible }) =>
        cx(
          "rounded-xl bg-primary p-4 shadow-xs",
          isSelected ? "ring-2 ring-brand" : "ring-1 ring-secondary",
          isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring",
        )
      }
    />
  );
}
