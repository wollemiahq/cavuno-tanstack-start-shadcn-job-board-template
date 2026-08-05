import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalPageContent } from './types';

export const privacyPolicyContent: LegalPageContent = {
  title: 'Privacy policy',
  description:
    'Placeholder privacy policy. Replace this description and body before launch.',
  Body: function PrivacyPolicyBody() {
    return (
      <>
        <LegalPlaceholderCallout />
        <h2>What this page should cover</h2>
        <p>
          Replace this section with your privacy policy after legal review. Do
          not leave template scaffolding in production.
        </p>
        <h2>What to document</h2>
        <p>
          Operators typically list what personal data is collected, why it is
          used, how long it is kept, and how people can contact you. Write those
          facts for your product — this template does not state them.
        </p>
        <h2>How to contact us</h2>
        <p>
          Replace this section with the contact channel for privacy questions.
        </p>
      </>
    );
  },
};
