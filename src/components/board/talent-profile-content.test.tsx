// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentProfileContent } from './talent-profile-content';
import { profileVm } from './talent-ui-test-fixtures';

beforeEach(() => {
  // CompanyAvatar renders the owned Avatar primitive, whose image is
  // load-gated: Base UI only reveals the <img> once the browser reports it
  // loaded, which never happens for jsdom's non-fetching images. Mock
  // `window.Image` to report a complete load so the logo path is exercised
  // deterministically (mirrors home-landing.test.tsx).
  vi.spyOn(window, 'Image').mockImplementation(function MockImage() {
    const image = document.createElement('img');
    Object.defineProperties(image, {
      complete: { value: true },
      naturalWidth: { value: 100 },
    });
    return image;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TalentProfileContent', () => {
  it('renders the complete public profile as a canonical h1 document without redundant actions', () => {
    render(<TalentProfileContent vm={profileVm} headingAs="h1" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(screen.getByText('Computing pioneer')).toBeVisible();
    expect(
      screen.getAllByText('London, United Kingdom').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Open to offers')).toBeVisible();
    expect(
      screen.getByText('I translate ambitious ideas into working systems.'),
    ).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Experience' })).toBeVisible();
    expect(screen.getByText('Analytical engineer')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Analytical Engines' }),
    ).toHaveAttribute('href', 'https://analytical.example');
    expect(screen.getByText('Jan 2022 – Present')).toBeVisible();
    expect(screen.getByText('Full time')).toBeVisible();
    expect(screen.getByText('Hybrid')).toBeVisible();
    expect(screen.getByText('Found via referral')).toBeVisible();
    expect(
      screen.getByText(
        'Designed the first general-purpose computing programs.',
      ),
    ).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Education' })).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'University of London' }),
    ).toHaveAttribute('href', 'https://university.example');
    expect(screen.getByText('Bachelor of Mathematics')).toBeVisible();
    expect(screen.getByText('First class honours')).toBeVisible();
    expect(screen.getByText('Analytical Society')).toBeVisible();
    expect(
      screen.getByText('Studied mathematical foundations of computation.'),
    ).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Skills' })).toBeVisible();
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Languages' })).toBeVisible();
    expect(screen.getByText('English')).toBeVisible();
    expect(screen.getByText('Fluent')).toBeVisible();

    expect(screen.queryByRole('link', { name: 'View profile' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /message|contact|save|apply/i }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: /message|contact|save|apply/i }),
    ).toBeNull();
  });

  it('renders an initials brand chip for each experience and education entry when no logo is present', () => {
    render(<TalentProfileContent vm={profileVm} headingAs="h1" />);

    // companyLogoUrl / institutionLogoUrl are null (the public API omits the
    // field), so CompanyAvatar shows the initials fallback.
    expect(screen.getByText('AE')).toBeVisible(); // Analytical Engines
    expect(screen.getByText('UO')).toBeVisible(); // University of London
  });

  it('shows the company logo image when the entry carries one', async () => {
    render(
      <TalentProfileContent
        vm={{
          ...profileVm,
          experiences: [
            {
              ...profileVm.experiences[0]!,
              companyLogoUrl: 'https://cdn.example/analytical-engines.png',
            },
          ],
        }}
        headingAs="h1"
      />,
    );

    // The window.Image mock (beforeEach) makes the load-gated AvatarImage
    // reveal deterministically, so the real logo <img> renders.
    expect(
      await screen.findByRole('img', { name: 'Analytical Engines' }),
    ).toHaveAttribute('src', 'https://cdn.example/analytical-engines.png');
  });

  it('uses an h2 in the search detail projection and omits empty optional sections', () => {
    render(
      <TalentProfileContent
        vm={{
          ...profileVm,
          bio: null,
          experiences: [],
          education: [],
          skills: [],
          languages: [],
        }}
        headingAs="h2"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Experience' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Education' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Skills' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Languages' })).toBeNull();
  });

  it('can omit the profile identity when a parent detail header owns it', () => {
    render(<TalentProfileContent vm={profileVm} showHeader={false} />);

    expect(screen.queryByRole('heading', { name: 'Ada Lovelace' })).toBeNull();
    expect(screen.queryByText('Computing pioneer')).toBeNull();
    expect(screen.queryByText('Open to offers')).toBeNull();
    expect(
      screen.getByText('I translate ambitious ideas into working systems.'),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Experience' })).toBeVisible();
  });
});
