import { m } from '../paraglide/messages';

import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';

/** The route's not-found view. Its own module: the router loads it eagerly,
 * and the sign-up form must not ride along into every page's shell. */
export function EmployerSignUpUnavailable() {
  return (
    <div>
      <Empty className="border-border bg-card border">
        <EmptyHeader>
          <EmptyDescription>
            {m.authEmployerSignUp_notAvailableText()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
