/**
 * Email-verification landing — the route board-auth emails link to
 * (ADR-0035: the emailed link carries this deployment's origin when its
 * publishable key has a registered origin). Consumes ?token= on load.
 */
import { createFileRoute } from "@tanstack/react-router";

import { AuthCard } from "../components/auth-form";
import { m } from "../paraglide/messages";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { verifyEmail } from "../server/auth";
import { candidateReturnTo, candidateSignInHref } from "../lib/candidate-return-to";

interface VerifySearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token: typeof search.token === "string" && search.token ? search.token : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.token) return { status: "missing-token" as const };
    const result = await verifyEmail({ data: { token: deps.token } });
    return result.ok ? { status: "verified" as const } : { status: "invalid" as const };
  },
  head: () => ({ meta: [{ title: m.authVerifyEmail_title() }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();

  if (status === "verified") {
    return (
      <AuthCard
        title={m.authVerifyEmail_verifiedTitle()}
        supportingText={m.authVerifyEmail_verifiedBody()}
      >
        <a href={returnTo} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {m.authVerifyEmail_goToAccountLabel()}
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={m.authVerifyEmail_invalidTitle()}
      supportingText={
        status === "missing-token"
          ? m.authVerifyEmail_missingTokenBody()
          : m.authVerifyEmail_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
      >
        {m.authVerifyEmail_signInLabel()}
      </a>
    </AuthCard>
  );
}
