import { m } from '../paraglide/messages';

/**
 * Newsletter sign-up copy. The consent label names the board: it is sent as
 * `consentText`, and the API refuses wording without the board's name.
 */
export function newsletterCopy(boardName: string) {
  return {
    title: m.newsletter_title(),
    description: m.newsletter_description({ boardName }),
    emailLabel: m.newsletter_emailLabel(),
    emailPlaceholder: m.newsletter_emailPlaceholder(),
    submitLabel: m.newsletter_submitLabel(),
    subscribingLabel: m.newsletter_subscribingLabel(),
    consentLabel: m.newsletter_consentLabel({ boardName }),
    consentRequired: m.newsletter_consentRequired(),
    submitted: m.newsletter_submitted(),
    sendingPaused: m.newsletter_sendingPaused({ boardName }),
    error: m.newsletter_error(),
  };
}
