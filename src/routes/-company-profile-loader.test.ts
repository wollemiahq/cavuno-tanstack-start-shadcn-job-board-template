import { BoardApiError } from '@cavuno/board';
import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCompanyProfileLoader,
  type CompanyProfileLoaderDependencies,
} from './-company-profile-loader';

const getCompanyProfilePage =
  vi.fn<CompanyProfileLoaderDependencies['getCompanyProfilePage']>();
const getSimilarCompanies =
  vi.fn<CompanyProfileLoaderDependencies['getSimilarCompanies']>();
const resolveRedirect =
  vi.fn<CompanyProfileLoaderDependencies['resolveRedirect']>();
const loadCompanyProfile = createCompanyProfileLoader({
  getCompanyProfilePage,
  getSimilarCompanies,
  resolveRedirect,
});

function load(publicHref: string) {
  return loadCompanyProfile({
    params: { companySlug: 'oud-bedrijf' },
    location: { publicHref },
  });
}

beforeEach(() => {
  getCompanyProfilePage.mockReset();
  getSimilarCompanies.mockReset();
  resolveRedirect.mockReset();
  getSimilarCompanies.mockRejectedValue(new Error('unused'));
  getCompanyProfilePage.mockRejectedValue(
    new BoardApiError({
      status: 404,
      code: 'not_found',
      message: 'Not found',
      raw: undefined,
    }),
  );
});

describe('company profile loader — a missing company', () => {
  it('308s to the managed redirect for the localized URL', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/bedrijven/oud-bedrijf',
      target: '/bedrijven/nieuw-bedrijf',
    });

    const result = load('/bedrijven/oud-bedrijf');

    await expect(result).rejects.toMatchObject({
      options: { href: '/bedrijven/nieuw-bedrijf', statusCode: 308 },
    });
    expect(resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/bedrijven/oud-bedrijf' },
    });
  });

  it('asks with the locale-prefixed URL the visitor typed', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/fr/entreprises/oud-bedrijf',
      target: null,
    });

    await expect(load('/fr/entreprises/oud-bedrijf?page=2')).rejects.toSatisfy(
      isNotFound,
    );
    expect(resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/fr/entreprises/oud-bedrijf' },
    });
  });

  it('404s when no managed redirect matches', async () => {
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/bedrijven/oud-bedrijf',
      target: null,
    });

    await expect(load('/bedrijven/oud-bedrijf')).rejects.toSatisfy(isNotFound);
  });

  it('rejects with any other failure without a redirect lookup', async () => {
    const outage = new BoardApiError({
      status: 503,
      code: 'unknown_error',
      message: 'Unavailable',
      raw: undefined,
    });
    getCompanyProfilePage.mockRejectedValue(outage);

    await expect(load('/bedrijven/oud-bedrijf')).rejects.toBe(outage);
    expect(resolveRedirect).not.toHaveBeenCalled();
  });
});
