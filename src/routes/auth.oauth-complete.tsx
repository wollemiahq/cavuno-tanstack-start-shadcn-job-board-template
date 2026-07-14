/** OAuth completion landing — exchanges the callback one-time token. */
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthCard } from "../components/auth-form";
import { m } from "../paraglide/messages";
import { exchangeOAuth } from "../server/auth";
import { candidateReturnTo, candidateSignInHref } from "../lib/candidate-return-to";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OAuthCompleteSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute("/auth/oauth-complete")({
  validateSearch: (search: Record<string, unknown>): OAuthCompleteSearch => ({
    token: typeof search.token === "string" && search.token ? search.token : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token) return { status: "missing-token" as const };
    const result = await exchangeOAuth({ data: { token: deps.token } });
    if (!result.ok) return { status: "invalid" as const };
    throw redirect({ href: deps.returnTo });
  },
  head: () => ({ meta: [{ title: m.authOauthComplete_title() }] }),
  component: OAuthCompletePage,
});

function OAuthCompletePage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();

  return (
    <AuthCard
      title={m.authOauthComplete_failedTitle()}
      supportingText={
        status === "missing-token"
          ? m.authOauthComplete_missingTokenBody()
          : m.authOauthComplete_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
      >
        {m.authOauthComplete_signInLabel()}
      </a>
    </AuthCard>
  );
}
