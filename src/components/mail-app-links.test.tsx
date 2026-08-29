// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MailAppLinks } from './mail-app-links';

afterEach(cleanup);

describe('MailAppLinks', () => {
  it('opens each webmail provider in a new tab', () => {
    render(
      <MailAppLinks gmailLabel="Open Gmail" outlookLabel="Open Outlook" />,
    );

    const gmail = screen.getByRole('link', { name: 'Open Gmail' });
    expect(gmail).toHaveAttribute('href', 'https://mail.google.com/');
    expect(gmail).toHaveAttribute('target', '_blank');
    expect(gmail).toHaveAttribute('rel', 'noreferrer');

    const outlook = screen.getByRole('link', { name: 'Open Outlook' });
    expect(outlook).toHaveAttribute('href', 'https://outlook.live.com/mail/');
    expect(outlook).toHaveAttribute('target', '_blank');
  });

  it('keeps the brand marks decorative so the label names the link', () => {
    const { container } = render(
      <MailAppLinks gmailLabel="Open Gmail" outlookLabel="Open Outlook" />,
    );

    const marks = container.querySelectorAll('svg');
    expect(marks).toHaveLength(2);
    for (const mark of marks) {
      expect(mark).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
