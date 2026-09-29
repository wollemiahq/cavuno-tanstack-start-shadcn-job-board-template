// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Footer, { type BoardContextFooter } from './Footer';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => null,
}));

afterEach(cleanup);

const contact: BoardContextFooter = {
  contactEmail: null,
  websiteUrl: null,
  xUrl: null,
  facebookUrl: null,
  linkedinUrl: null,
  instagramUrl: null,
};

function renderFooter(footer: BoardContextFooter) {
  return render(
    <Footer
      boardName="Example Jobs"
      logoUrl={null}
      language="en"
      showCavunoBranding={false}
      primaryDomain={null}
      slug="example-jobs"
      features={{
        blog: false,
        talentDirectory: 'off',
        publicJobSubmission: false,
        impressum: false,
      }}
      footer={footer}
      contactEnabled={false}
      talentDirectoryVisibility="off"
      hasEmployerOfferPage={false}
    />,
  );
}

describe('Footer social links', () => {
  it('links to a configured Instagram profile', () => {
    renderFooter({
      ...contact,
      instagramUrl: 'https://www.instagram.com/example.jobs/',
    });

    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/example.jobs/',
    );
  });

  it('omits Instagram when the board has no profile configured', () => {
    renderFooter(contact);

    expect(screen.queryByRole('link', { name: 'Instagram' })).toBeNull();
  });
});
