import type {
  Alert,
  Application,
  PublicCompanyDetail,
  PublicJob,
  PublicJobCard,
} from '@cavuno/board';

export function publicCompanyFixture(
  slug: string,
  summary: string | null = null,
): PublicCompanyDetail {
  return {
    id: `company-${slug}`,
    object: 'public_company',
    slug,
    name: slug,
    logoUrl: null,
    website: null,
    description: null,
    summary,
    jobCount: 1,
    publishedJobCount: 1,
    salarySampleCount: 0,
    membership: null,
    markets: [],
    customFieldValues: {},
    customFieldMedia: {},
    objectReferences: [],
    links: { public: `https://jobs.example/companies/${slug}` },
  };
}

export function publicJobFixture(slug: string): PublicJob {
  return {
    id: `job-${slug}`,
    object: 'public_job',
    slug,
    title: slug,
    status: 'published',
    companyId: 'company-acme',
    description: null,
    applicationUrl: null,
    company: {
      id: 'company-acme',
      slug: null,
      name: null,
      logoUrl: null,
      website: null,
    },
    officeLocations: [],
    placeHierarchy: [],
    categories: [],
    skills: [],
    remoteOption: null,
    remoteWorldwide: false,
    remoteWorkPermitCountryCodes: [],
    remoteWorkPermitSubdivisionCodes: [],
    remotePermits: [],
    remoteAllowedTzOffsets: [],
    remoteSponsorship: 'unknown',
    remoteTimezones: [],
    educationRequirements: [],
    experienceMonths: null,
    experienceInPlaceOfEducation: null,
    inOfficePeriod: null,
    inOfficeFrequency: null,
    customFieldValues: {},
    resolvedCollectionFields: [],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    isSponsored: false,
    applyAction: 'external_direct',
    seniority: null,
    employmentType: null,
    customEmploymentType: null,
    publishedAt: null,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    links: { public: `https://jobs.example/companies/acme/jobs/${slug}` },
  };
}

export function publicJobCardFixture(slug: string): PublicJobCard {
  return {
    id: `job-${slug}`,
    object: 'job_card',
    customFieldValues: {},
    slug,
    title: slug,
    description: null,
    publishedAt: null,
    employmentType: null,
    customEmploymentType: null,
    remoteOption: null,
    remoteLocationLabel: null,
    remoteWorldwide: false,
    remoteWorkPermitCountryCodes: [],
    locationLabel: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryTimeframe: null,
    isFeatured: false,
    isSponsored: false,
    summary: null,
    company: {
      slug: 'acme',
      name: 'Acme',
      logoUrl: null,
      customFieldValues: {},
    },
    categories: [],
    skills: [],
    links: { public: `https://jobs.example/companies/acme/jobs/${slug}` },
  };
}

export function applicationFixture(): Application {
  return {
    id: 'application-1',
    object: 'application',
    status: 'applied',
    appliedAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    coverNote: null,
    candidateName: null,
    candidateEmail: null,
    candidateLocation: null,
    candidateHeadline: null,
    resumeFilename: null,
    job: null,
  };
}

/** A signed-in viewer's alert; `filters` merge over empty stored filters. */
export function alertFixture(
  overrides: Partial<Omit<Alert, 'filters'>> & {
    filters?: Partial<Alert['filters']>;
  } = {},
): Alert {
  const { filters, ...rest } = overrides;
  return {
    id: 'alert-1',
    object: 'alert',
    label: null,
    frequency: 'weekly',
    isActive: true,
    kind: 'filters',
    anchorJob: null,
    lastSentAt: null,
    ...rest,
    filters: {
      query: null,
      jobFunctions: [],
      seniorityLevels: [],
      remoteOptions: [],
      placeIds: [],
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      ...filters,
    },
  };
}
