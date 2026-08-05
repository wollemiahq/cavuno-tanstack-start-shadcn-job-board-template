// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarketingConsentField } from './marketing-consent-field';

const DECLARATION = {
  disclosureText: 'Email me occasional news from Acme Jobs.',
  privacyPolicyUrl: 'https://acme.example/privacy',
  disclosureVersion: 2,
};

afterEach(cleanup);

describe('MarketingConsentField', () => {
  it('renders nothing when the board has no active capture', () => {
    // `null` is what `flow.loadDeclaration()` returns for a board that has not
    // configured capture — the default state. Rendering a checkbox anyway
    // would collect consent against a declaration that does not exist.
    const { container } = render(
      <MarketingConsentField
        declaration={null}
        checked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('labels the checkbox with the board-declared disclosure verbatim', () => {
    render(
      <MarketingConsentField
        declaration={DECLARATION}
        checked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Email me occasional news from Acme Jobs.'),
    ).toBeVisible();
  });

  it('starts unchecked so a tick is a deliberate act', () => {
    render(
      <MarketingConsentField
        declaration={DECLARATION}
        checked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('reports ticks to the owning form', () => {
    const onCheckedChange = vi.fn();
    render(
      <MarketingConsentField
        declaration={DECLARATION}
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('links the privacy policy out to the declared URL', () => {
    render(
      <MarketingConsentField
        declaration={DECLARATION}
        checked={false}
        onCheckedChange={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(link).toHaveAttribute('href', 'https://acme.example/privacy');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
