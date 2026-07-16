// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CandidateAccountShell } from './candidate-account-shell';

afterEach(cleanup);

describe('CandidateAccountShell', () => {
  it('owns the account page landmark and renders route content', () => {
    render(
      <CandidateAccountShell>
        <h1>Profile editor</h1>
      </CandidateAccountShell>,
    );

    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('Profile editor');
    expect(
      main.querySelector('[data-slot="candidate-account-content"]'),
    ).not.toBeNull();
  });

  it('renders no sidebar navigation — account nav lives in the header avatar menu (CAV-510)', () => {
    render(
      <CandidateAccountShell>
        <p>Content</p>
      </CandidateAccountShell>,
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
