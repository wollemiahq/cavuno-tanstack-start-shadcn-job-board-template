import { createFileRoute, useRouter } from "@tanstack/react-router";

import { RheaRegistrationPage } from "@/components/rhea-auth-pilot";
import { buttonVariants } from "@/components/ui/button";
import { m } from "../paraglide/messages";
import { signUp } from "../server/auth";
import { getBoardContext } from "../server/queries";
import {
  candidateReturnTo,
  candidateSignInHref,
  candidateVerifyEmailHref,
} from "../lib/candidate-return-to";

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === "string" && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  loader: async () => {
    const board = await getBoardContext();
    return { boardName: board.name };
  },
  head: () => ({ meta: [{ title: m.authSignUp_title() }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);

  return (
    <RheaRegistrationPage
      title={m.authSignUp_title()}
      supportingText={m.authSignUp_supportingText({ boardName })}
      copy={{
        nameLabel: m.authSignUp_nameLabel(),
        emailLabel: m.authSignUp_emailLabel(),
        passwordLabel: m.authSignUp_passwordLabel(),
        submitLabel: m.authSignUp_submitLabel(),
        pendingLabel: m.authSignUp_creatingAccountLabel(),
        successTitle: m.authSignUp_checkEmailTitle(),
        successText: m.authSignUp_checkEmailBody(),
        successActionLabel: m.authSignUp_goToAccountLabel(),
      }}
      successHref={candidateVerifyEmailHref(returnTo)}
      onSubmit={async (values) => {
        const result = await signUp({ data: values });
        if (result.ok) await router.invalidate();
        return result;
      }}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {m.authSignUp_alreadyHaveAccountText()}{" "}
          <a
            href={candidateSignInHref(returnTo)}
            className={buttonVariants({ variant: "link", size: "sm" })}
          >
            {m.authSignUp_signInLink()}
          </a>
        </p>
      }
    />
  );
}
