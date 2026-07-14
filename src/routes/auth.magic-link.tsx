/** Magic-link landing — consumes ?token= and creates the starter session. */
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthCard } from "../components/auth-form";
import { m } from "../paraglide/messages";
import { consumeMagicLink } from "../server/auth";
import { candidateReturnTo, candidateSignInHref } from "../lib/candidate-return-to";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MagicLinkSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute("/auth/magic-link")({
  validateSearch: (search: Record<string, unknown>): MagicLinkSearch => ({
    token: typeof search.token === "string" && search.token ? search.token : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token) return { status: "missing-token" as const };
    const result = await consumeMagicLink({ data: { token: deps.token } });
    if (!result.ok) return { status: "invalid" as const };
    throw redirect({ href: deps.returnTo });
  },
  head: () => ({ meta: [{ title: m.authMagicLink_title() }] }),
  component: MagicLinkPage,
});

function MagicLinkPage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();

  return (
    <AuthCard
      title={m.authMagicLink_invalidTitle()}
      supportingText={
        status === "missing-token"
          ? m.authMagicLink_missingTokenBody()
          : m.authMagicLink_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
      >
        {m.authMagicLink_signInLabel()}
      </a>
    </AuthCard>
  );
}
