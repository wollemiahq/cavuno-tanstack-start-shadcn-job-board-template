import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalPageContent } from './types';

export const impressumContent: LegalPageContent = {
  title: 'Impressum',
  description:
    'Placeholder impressum. Replace this description and body before launch.',
  Body: function ImpressumBody() {
    return (
      <>
        <LegalPlaceholderCallout />
        <h2>What this page should cover</h2>
        <p>
          Replace this section with the impressum details required in your
          jurisdiction after legal review. Do not leave template scaffolding in
          production.
        </p>
        <h2>Legal entity facts</h2>
        <p>
          Fill in `legalEntity` in `src/content/legal/types.ts` (legal name and
          address) so the facts card above the body can render. Leave it unset
          until those values are ready.
        </p>
        <h2>How to contact us</h2>
        <p>
          Replace this section with the public contact details required for the
          impressum.
        </p>
      </>
    );
  },
};
