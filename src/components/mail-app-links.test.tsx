// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { MailAppLinks } from './mail-app-links';

afterEach(cleanup);

describe('MailAppLinks', () => {
  it('opens each webmail provider in a new tab, named by aria-label', () => {
    render(<MailAppLinks />);

    const expected = [
      [m.authSignIn_openGmailLabel(), 'https://mail.google.com/'],
      [m.authSignIn_openOutlookLabel(), 'https://outlook.live.com/mail/'],
      [m.authSignIn_openYahooLabel(), 'https://mail.yahoo.com/'],
      [m.authSignIn_openIcloudLabel(), 'https://www.icloud.com/mail'],
      [m.authSignIn_openProtonLabel(), 'https://mail.proton.me/'],
    ] as const;

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(expected.length);
    for (const [index, [name, href]] of expected.entries()) {
      expect(links[index]).toHaveAccessibleName(name);
      expect(links[index]).toHaveAttribute('href', href);
      expect(links[index]).toHaveAttribute('target', '_blank');
      expect(links[index]).toHaveAttribute('rel', 'noreferrer');
    }
  });

  it('keeps the brand marks decorative so the accessible name is the label', () => {
    const { container } = render(<MailAppLinks />);

    const marks = container.querySelectorAll('svg');
    expect(marks).toHaveLength(5);
    for (const mark of marks) {
      expect(mark).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
