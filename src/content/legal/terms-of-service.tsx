import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalPageContent } from './types';

export const termsOfServiceContent: LegalPageContent = {
  title: 'Terms of service',
  description:
    'Placeholder terms of service. Replace this description and body before launch.',
  Body: function TermsOfServiceBody() {
    return (
      <>
        <LegalPlaceholderCallout />
        <h2>What this page should cover</h2>
        <p>
          Replace this section with your terms of service after legal review. Do
          not leave template scaffolding in production.
        </p>
        <h2>What to document</h2>
        <p>
          Operators typically describe who may use the board, acceptable use,
          accounts, and liability limits. Write those rules for your product —
          this template does not state them.
        </p>
        <h2>How to contact us</h2>
        <p>
          Replace this section with the contact channel for terms questions.
        </p>
      </>
    );
  },
};
