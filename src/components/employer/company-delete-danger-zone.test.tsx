// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompanyDeleteDangerZone } from './company-delete-danger-zone';

import { m } from '@/paraglide/messages';

describe('CompanyDeleteDangerZone', () => {
  const actions = {
    deleteCompany: vi.fn(),
    invalidate: vi.fn(),
    navigateToDashboard: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  };

  it('does not render when the board has disabled employer company deletion', () => {
    render(
      <CompanyDeleteDangerZone
        slug="acme"
        companyName="Acme"
        isAdmin
        otherApprovedMembers={0}
        deletionEnabled={false}
        actions={actions}
      />,
    );
    expect(screen.queryByText(m.employerDelete_heading())).toBeNull();
  });

  it('renders the danger zone when deletion is enabled', () => {
    render(
      <CompanyDeleteDangerZone
        slug="acme"
        companyName="Acme"
        isAdmin
        otherApprovedMembers={0}
        deletionEnabled
        actions={actions}
      />,
    );
    expect(screen.getByText(m.employerDelete_heading())).toBeInTheDocument();
  });
});
