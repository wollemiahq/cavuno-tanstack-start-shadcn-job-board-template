import { isBoardApiError } from '@cavuno/board';
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { gatedRead } from './board-access';

export type BoardContact = {
  object: 'board_contact';
  enabled: boolean;
  boardName: string;
};

export type ContactSubmission = {
  object: 'contact_submission';
  success: true;
};

export type ContactInput = {
  name: string;
  email: string;
  body: string;
  requestId: string;
  website?: string;
};

type BoardContactInput = ContactInput & { subject: string };

export type ContactSubmissionResult =
  | { ok: true; data: ContactSubmission }
  | { ok: false; message: string };

/** Keep a short inbox title while the visitor only writes a message. */
export function subjectFromMessage(body: string): string {
  const opening = body.trim().replace(/\s+/g, ' ');
  const sentenceEnd = opening.search(/[.!?](?=\s|$)/u);
  const summary =
    sentenceEnd >= 20 && sentenceEnd < 80
      ? opening.slice(0, sentenceEnd + 1)
      : opening;
  const characters = Array.from(summary);
  if (characters.length <= 80) return summary;
  const prefix = characters.slice(0, 79).join('').trimEnd();
  const lastSpace = prefix.lastIndexOf(' ');
  return `${lastSpace > 40 ? prefix.slice(0, lastSpace) : prefix}…`;
}

export function validateContactInput(input: ContactInput): BoardContactInput {
  const name = input.name.trim();
  const email = input.email.trim();
  const body = input.body.trim();
  if (!name || name.length > 150) throw new Error('Invalid contact name');
  if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Invalid contact email');
  }
  if (!body || body.length > 20_000) throw new Error('Invalid contact message');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.requestId,
    )
  ) {
    throw new Error('Invalid contact request id');
  }
  return {
    name,
    email,
    subject: subjectFromMessage(body),
    body,
    requestId: input.requestId,
    website: input.website?.slice(0, 200),
  };
}

/** Read the operator's contact-form switch. Older APIs safely appear disabled. */
export const getContact = createServerFn({ method: 'GET' }).handler(() =>
  getBoard().client.fetch<BoardContact>('/contact'),
);

/** Root chrome must survive while a deployment rolls out the Contact endpoint. */
export const getContactForRoot = createServerOnlyFn(
  async (): Promise<BoardContact | null> => {
    try {
      return await getBoard().client.fetch<BoardContact>('/contact');
    } catch {
      return null;
    }
  },
);

export const submitContact = createServerFn({ method: 'POST' })
  .validator(validateContactInput)
  .middleware([boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (headers): Promise<ContactSubmissionResult> => {
      try {
        const contact = await getBoard().client.fetch<BoardContact>('/contact');
        if (!contact.enabled) {
          return { ok: false, message: 'Contact is unavailable.' };
        }
        const result = await getBoard().client.fetch<ContactSubmission>(
          '/contact',
          {
            method: 'POST',
            body: data,
            headers,
          },
        );
        return { ok: true, data: result };
      } catch (error) {
        if (isBoardApiError(error))
          return { ok: false, message: error.message };
        throw error;
      }
    }),
  );
