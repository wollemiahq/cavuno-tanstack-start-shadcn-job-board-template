import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { emailDomainRefusal } from '../lib/email-domain-refusal';

import type { BoardSubscribeInput } from '@cavuno/board';

/**
 * Newsletter sign-up (`board.subscribe`). The form sends the consent
 * wording, `timeZone`, `locale` and `pageUrl` from the browser: this server
 * call carries neither the visitor's time zone nor their page as `Referer`.
 * Kept out of `queries.ts` so only the pages with the form load its stub.
 */
export const subscribeNewsletter = createServerFn({ method: 'POST' })
  .validator((input: BoardSubscribeInput) => input)
  .handler(async ({ data }) => {
    try {
      const result = await getBoard().subscribe(data);
      return {
        status: 'submitted' as const,
        sendingPaused: result.sendingPaused,
      };
    } catch (error) {
      // A mistyped domain is the person's to fix, so the form gets it as a
      // result (with the API's correction) rather than a generic failure.
      const refusal = emailDomainRefusal(error);
      if (refusal) {
        return { status: 'email_domain_undeliverable' as const, ...refusal };
      }
      throw error;
    }
  });
