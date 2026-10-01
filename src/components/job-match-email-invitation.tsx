import { Link } from '@tanstack/react-router';
import { ArrowRight, Mail } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { m } from '@/paraglide/messages';
import type { NotificationPreference } from '@cavuno/board';

/** Invite opted-out candidates to the existing email preference in Settings. */
export function JobMatchEmailInvitation({
  preference,
}: {
  preference: NotificationPreference | null;
}) {
  if (!preference || preference.subscribed) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle
          role="heading"
          aria-level={2}
          className="flex items-center gap-2"
        >
          <Mail className="size-4" aria-hidden="true" />
          {m.accountRecommended_emailInvitationTitle()}
        </CardTitle>
        <CardDescription>
          {m.notificationSettings_recommendedJobEmailsDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          to="/settings"
          hash="job-match-emails"
          hashScrollIntoView={{ block: 'center' }}
          className={buttonVariants({ className: 'w-full' })}
        >
          {m.accountRecommended_emailInvitationAction()}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
