import { Link } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import { candidateAuthSearch } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function VerifyEmailView({
  status,
  returnTo,
}: {
  status: 'missing-token' | 'invalid';
  returnTo: string;
}) {
  return (
    <AuthCard
      title={m.authVerifyEmail_invalidTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authVerifyEmail_missingTokenBody()
          : m.authVerifyEmail_invalidBody()
      }
    >
      <Link
        to="/auth/sign-in"
        search={candidateAuthSearch(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authVerifyEmail_signInLabel()}
      </Link>
    </AuthCard>
  );
}
