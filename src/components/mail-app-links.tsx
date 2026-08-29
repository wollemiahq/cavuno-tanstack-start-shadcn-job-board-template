import { m } from "../paraglide/messages";

import { GmailIcon, OutlookIcon } from "@/components/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GMAIL_HREF = "https://mail.google.com/";
const OUTLOOK_HREF = "https://outlook.live.com/mail/";

/**
 * Stripe's check-inbox pattern: offer Gmail or Outlook only when the address
 * is actually hosted there. Unknown domains get no mail-app CTA — guessing
 * both is the two-tile picker this replaced.
 */
export function mailAppForEmail(email: string): "gmail" | "outlook" | null {
  const host = email.split("@").at(1)?.trim().toLowerCase();
  if (!host) return null;
  if (host === "gmail.com" || host === "googlemail.com") return "gmail";
  if (
    host === "outlook.com" ||
    host === "hotmail.com" ||
    host === "live.com" ||
    host === "msn.com"
  ) {
    return "outlook";
  }
  return null;
}

/**
 * One outline button, same shape as "Continue with Google": brand mark to
 * the leading edge of the label, full width of the auth card.
 */
export function MailAppLinks({
  email,
  gmailLabel,
  outlookLabel,
}: {
  email: string;
  gmailLabel: string;
  outlookLabel: string;
}) {
  const app = mailAppForEmail(email);
  if (!app) return null;

  const isGmail = app === "gmail";
  const Icon = isGmail ? GmailIcon : OutlookIcon;

  return (
    <a
      href={isGmail ? GMAIL_HREF : OUTLOOK_HREF}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
    >
      <Icon className="size-4" />
      {isGmail ? gmailLabel : outlookLabel}
    </a>
  );
}

/** The candidate-auth wording (sign-in and password reset share a catalog). */
export function AuthMailAppLinks({ email }: { email: string }) {
  return (
    <MailAppLinks
      email={email}
      gmailLabel={m.authSignIn_openGmailLabel()}
      outlookLabel={m.authSignIn_openOutlookLabel()}
    />
  );
}
