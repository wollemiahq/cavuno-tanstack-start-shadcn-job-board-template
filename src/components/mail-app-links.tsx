import { m } from "../paraglide/messages";

import {
  AppleIcon,
  GmailIcon,
  OutlookIcon,
  ProtonMailIcon,
  YahooIcon,
} from "@/components/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAIL_APPS = [
  {
    href: "https://mail.google.com/",
    label: () => m.authSignIn_openGmailLabel(),
    Icon: GmailIcon,
  },
  {
    href: "https://outlook.live.com/mail/",
    label: () => m.authSignIn_openOutlookLabel(),
    Icon: OutlookIcon,
  },
  {
    href: "https://mail.yahoo.com/",
    label: () => m.authSignIn_openYahooLabel(),
    Icon: YahooIcon,
  },
  {
    href: "https://www.icloud.com/mail",
    label: () => m.authSignIn_openIcloudLabel(),
    Icon: AppleIcon,
  },
  {
    href: "https://mail.proton.me/",
    label: () => m.authSignIn_openProtonLabel(),
    Icon: ProtonMailIcon,
  },
] as const;

/**
 * Icon-only shortcuts into the big webmail apps. Visible labels live on
 * `aria-label`; a heading over the row would restate the card.
 */
export function MailAppLinks() {
  return (
    <nav aria-label={m.authSignIn_openInboxLabel()} className="flex justify-center gap-2">
      {MAIL_APPS.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label()}
          className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
        >
          <Icon className="size-5" />
        </a>
      ))}
    </nav>
  );
}

/** The candidate-auth wording (sign-in and password reset share a catalog). */
export function AuthMailAppLinks() {
  return <MailAppLinks />;
}
