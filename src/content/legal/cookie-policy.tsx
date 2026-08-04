import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalPageContent } from './types';

export const cookiePolicyContent: LegalPageContent = {
  title: 'Cookie policy',
  description:
    'Placeholder cookie policy. Replace this description and body before launch.',
  Body: function CookiePolicyBody() {
    return (
      <>
        <LegalPlaceholderCallout />
        <h2>What this page should cover</h2>
        <p>
          Replace this section with your cookie policy after legal review. Do
          not leave template scaffolding in production.
        </p>
        <h2>What to document</h2>
        <p>
          Operators typically list which cookies or similar technologies the
          site uses, their purpose, and how visitors can change preferences.
          Write those facts for your setup — this template does not state them.
        </p>
        <h2>How to contact us</h2>
        <p>
          Replace this section with the contact channel for cookie questions.
        </p>
      </>
    );
  },
};
