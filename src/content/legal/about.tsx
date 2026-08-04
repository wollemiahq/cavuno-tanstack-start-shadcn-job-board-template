import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalPageContent } from './types';

export const aboutContent: LegalPageContent = {
  title: 'About',
  description:
    'Placeholder about page. Replace this description and body before launch.',
  Body: function AboutBody() {
    return (
      <>
        <LegalPlaceholderCallout />
        <h2>Who we are</h2>
        <p>
          Replace this section with a short introduction to your organization or
          board.
        </p>
        <h2>What this board is for</h2>
        <p>
          Replace this section with the purpose of the board and who it serves.
        </p>
        <h2>How to contact us</h2>
        <p>
          Replace this section with the public contact details you want
          candidates and employers to use.
        </p>
      </>
    );
  },
};
