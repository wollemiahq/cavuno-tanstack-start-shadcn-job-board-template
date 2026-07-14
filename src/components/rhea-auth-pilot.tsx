import { useState } from "react";
import { BriefcaseBusiness } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function RheaAuthCard({
  title,
  supportingText,
  announceTitle = false,
  children,
}: {
  title: string;
  supportingText?: React.ReactNode;
  announceTitle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rhea-theme mx-auto w-full max-w-md py-6 sm:py-12">
      <Card className="overflow-hidden border-0 bg-card/95 shadow-xl shadow-foreground/5 backdrop-blur">
        <CardHeader className="items-center gap-5 text-center">
          <div
            aria-hidden
            className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
          >
            <BriefcaseBusiness className="size-5" />
          </div>
          <div
            className="grid gap-2"
            role={announceTitle ? "status" : undefined}
            aria-live={announceTitle ? "polite" : undefined}
          >
            <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground">
              {title}
            </h1>
            {supportingText ? (
              <p className="text-sm leading-6 text-muted-foreground">{supportingText}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">{children}</CardContent>
      </Card>
    </div>
  );
}

export function RoleSelector({
  value,
  onValueChange,
  ariaLabel,
  candidateTitle,
  candidateBody,
  employerTitle,
  employerBody,
}: {
  value: "candidate" | "employer";
  onValueChange: (value: "candidate" | "employer") => void;
  ariaLabel: string;
  candidateTitle: string;
  candidateBody: string;
  employerTitle: string;
  employerBody: string;
}) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange} aria-label={ariaLabel}>
      <RoleOption
        value="candidate"
        title={candidateTitle}
        body={candidateBody}
        selected={value === "candidate"}
        onSelect={() => onValueChange("candidate")}
      />
      <RoleOption
        value="employer"
        title={employerTitle}
        body={employerBody}
        selected={value === "employer"}
        onSelect={() => onValueChange("employer")}
      />
    </RadioGroup>
  );
}

function RoleOption({
  value,
  title,
  body,
  selected,
  onSelect,
}: {
  value: "candidate" | "employer";
  title: string;
  body: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-2xl border bg-background p-4 transition-colors hover:bg-muted",
        selected ? "border-primary bg-muted" : "border-border",
      )}
      onClick={onSelect}
    >
      <RadioGroupItem value={value} aria-label={`${title}. ${body}`} className="mt-0.5" />
      <span className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm leading-5 text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}

type RegistrationCopy = {
  nameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  submitLabel: string;
  pendingLabel: string;
  successTitle: string;
  successText: string;
  successActionLabel: string;
};

type RegistrationResult = { ok: true } | { ok: false; message: string };

type RegistrationStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "error"; message: string }
  | { state: "success" };

export function RheaRegistrationPage({
  title,
  supportingText,
  copy,
  successHref,
  onSubmit,
  footer,
}: {
  title: string;
  supportingText: React.ReactNode;
  copy: RegistrationCopy;
  successHref: string;
  onSubmit: (values: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<RegistrationResult>;
  footer?: React.ReactNode;
}) {
  const [status, setStatus] = useState<RegistrationStatus>({ state: "idle" });
  const succeeded = status.state === "success";

  return (
    <RheaAuthCard
      title={succeeded ? copy.successTitle : title}
      supportingText={succeeded ? copy.successText : supportingText}
      announceTitle={succeeded}
    >
      {succeeded ? (
        <a href={successHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {copy.successActionLabel}
        </a>
      ) : (
        <>
          <RegistrationForm
            copy={copy}
            status={status}
            onSubmit={onSubmit}
            onStatusChange={setStatus}
          />
          {footer}
        </>
      )}
    </RheaAuthCard>
  );
}

function RegistrationForm({
  copy,
  status,
  onSubmit,
  onStatusChange,
}: {
  copy: RegistrationCopy;
  status: RegistrationStatus;
  onSubmit: (values: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<RegistrationResult>;
  onStatusChange: (status: RegistrationStatus) => void;
}) {
  const pending = status.state === "pending";

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        onStatusChange({ state: "pending" });
        const form = new FormData(event.currentTarget);
        try {
          const result = await onSubmit({
            displayName: String(form.get("displayName")),
            email: String(form.get("email")),
            password: String(form.get("password")),
          });
          onStatusChange(
            result.ok ? { state: "success" } : { state: "error", message: result.message },
          );
        } catch {
          onStatusChange({ state: "error", message: m.candidateAction_errorText() });
        }
      }}
    >
      <Field label={copy.nameLabel} name="displayName" autoComplete="name" />
      <Field label={copy.emailLabel} name="email" type="email" autoComplete="email" />
      <Field
        label={copy.passwordLabel}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
      />
      <FormError message={status.state === "error" ? status.message : null} />
      <Button
        type="submit"
        size="lg"
        className="w-full data-disabled:pointer-events-none data-disabled:opacity-50"
        disabled={pending}
        focusableWhenDisabled
      >
        {pending ? copy.pendingLabel : copy.submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
