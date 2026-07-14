import { isUnauthorized } from '@cavuno/board';
import { isRedirect, redirect } from '@tanstack/react-router';

export function handleEmployerLoaderError(
  error: unknown,
  returnTo: string,
): never {
  if (isRedirect(error)) throw error;

  if (
    isUnauthorized(error) ||
    (error instanceof Error && error.message.includes('UNAUTHENTICATED'))
  ) {
    throw redirect({
      to: '/auth/sign-in',
      search: { returnTo },
    });
  }

  throw error;
}
