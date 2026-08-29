import { m } from '../paraglide/messages';

import { GmailIcon, OutlookIcon } from '@/components/brand-icons';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Webmail shortcuts for a "check your inbox" screen: the brand mark sits
 * centred above its label so the pair reads as two destinations rather than
 * two words of prose.
 */
const mailAppLinkClassName = cn(
  buttonVariants({ variant: 'outline' }),
  'h-auto w-32 flex-col gap-2 px-4 py-3',
);

export function MailAppLinks({
  gmailLabel,
  outlookLabel,
  className,
}: {
  gmailLabel: string;
  outlookLabel: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap justify-center gap-3', className)}>
      <a
        href="https://mail.google.com/"
        target="_blank"
        rel="noreferrer"
        className={mailAppLinkClassName}
      >
        <GmailIcon className="size-6" />
        {gmailLabel}
      </a>
      <a
        href="https://outlook.live.com/mail/"
        target="_blank"
        rel="noreferrer"
        className={mailAppLinkClassName}
      >
        <OutlookIcon className="size-6" />
        {outlookLabel}
      </a>
    </div>
  );
}

/** The candidate-auth wording (sign-in and password reset share a catalog). */
export function AuthMailAppLinks({ className }: { className?: string }) {
  return (
    <MailAppLinks
      gmailLabel={m.authSignIn_openGmailLabel()}
      outlookLabel={m.authSignIn_openOutlookLabel()}
      className={className}
    />
  );
}
