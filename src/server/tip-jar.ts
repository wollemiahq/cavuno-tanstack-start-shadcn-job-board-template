/**
 * The tip page over `board.tipJar.*`: the tip jar itself, starting a tip
 * (an embedded Stripe Checkout mount kit) and reading the checkout once
 * Stripe sends the tipper back.
 *
 * A board without a tip jar (or with an archived one) answers
 * `tip_jar_not_found`: the page is a 404 and the footer link is hidden.
 * Checkout refusals come back as `{ ok: false, code }` for the form to word
 * under its field, like product checkout.
 */
import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS } from '@cavuno/board/paths';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { selfUrl } from '../lib/self-url';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { asResult, assertRelative } from './products';

import type { TipJar, TipJarCheckout, TipJarCheckoutBody } from '@cavuno/board';

/** `/tip` — the tip jar and the page's head. */
export const getTipPage = createServerFn({ method: 'GET' })
  .validator((input: { returning: boolean }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      let tipJar: TipJar;
      try {
        tipJar = await getBoard().tipJar.get({ headers });
      } catch (error) {
        if (isNotFound(error)) throw notFound();
        throw error;
      }
      const [boardContext, origin] = await Promise.all([
        readBoardContext(),
        readPublicOrigin(),
      ]);
      const canonical = selfUrl(origin, BOARD_PATHS.tip);
      const description =
        tipJar.description ??
        m.tip_metaDescription({ boardName: boardContext.name });
      return {
        tipJar,
        head: {
          meta: [
            { title: headTitle(boardContext.name, tipJar.name) },
            { name: 'description', content: description },
            { property: 'og:title', content: tipJar.name },
            { property: 'og:description', content: description },
            { property: 'og:url', content: canonical },
            // The return from Stripe carries the tipper's session id.
            ...(data.returning
              ? [{ name: 'robots', content: 'noindex, nofollow' }]
              : []),
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
      };
    }),
  );

function viewerHeaders(context: BoardAccessContext) {
  // Signed in, the bearer fills the tipper's email in on Stripe's form.
  return context.boardAccessHeaders;
}

export type TipCheckoutInput = {
  amountCents: number;
  note?: string;
  website?: string;
  /** Only when the tipper ticked "cover the card fee". */
  coverFee?: true;
  returnPath: string;
};

/** Start a tip: an embedded Stripe Checkout mount kit. */
export const startTipCheckout = createServerFn({ method: 'POST' })
  .validator((input: TipCheckoutInput) => {
    assertRelative(input.returnPath);
    return input;
  })
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    asResult<TipJarCheckout>(() => {
      const body: TipJarCheckoutBody = {
        amountCents: data.amountCents,
        note: data.note || undefined,
        // Omitted unless a bot filled the hidden field.
        website: data.website || undefined,
        returnPath: data.returnPath,
      };
      // Left out unless ticked, so other tips send the same body as before.
      if (data.coverFee === true) body.coverFee = true;
      return getBoard().tipJar.checkout(body, {
        headers: viewerHeaders(context),
        cache: 'no-store',
      });
    }),
  );

/** After Stripe returns the tipper: `processing` until it is `paid`. */
export const getTipCheckoutState = createServerFn({ method: 'GET' })
  .validator((input: { sessionId: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    asResult(() =>
      getBoard().tipJar.getCheckout(data.sessionId, {
        headers: viewerHeaders(context),
        cache: 'no-store',
      }),
    ),
  );
