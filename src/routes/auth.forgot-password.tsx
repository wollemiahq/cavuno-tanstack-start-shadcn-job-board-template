import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AuthCard, Field, FormError } from "../components/auth-form";
import { m } from "../paraglide/messages";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forgotPassword } from "../server/auth";
import {
  candidateReturnTo,
  candidateSignInHref,
} from "../lib/candidate-return-to";

export const Route = createFileRoute("/auth/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === "string" && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  head: () => ({ meta: [{ title: m.authForgotPassword_title() }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const returnTo = candidateReturnTo(Route.useSearch().returnTo);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <AuthCard
        title={m.authForgotPassword_checkEmailTitle()}
        supportingText={m.authForgotPassword_checkEmailBody()}
      >
        <a
          href={candidateSignInHref(returnTo)}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          {m.authForgotPassword_backToSignInLabel()}
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authForgotPassword_title()}>
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            await forgotPassword({
              data: { email: String(form.get("email")) },
            });
            setSent(true);
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
        }}
      >
        <Field
          label={m.authForgotPassword_emailLabel()}
          name="email"
          type="email"
          autoComplete="email"
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? m.authForgotPassword_sendingLabel() : m.authForgotPassword_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  );
}
