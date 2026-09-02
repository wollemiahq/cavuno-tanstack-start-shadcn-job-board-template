import type { LinkOptions } from '@tanstack/react-router';

/**
 * One listing-family entity's transit: canonical detail (always the href),
 * desktop homepage listing target, and the `selected*` value for in-place select.
 */
export type MasterDetailDestination = {
  /** Always the rendered href. Typed route options, never a string-built path. */
  canonical: LinkOptions;
  /** Desktop homepage click target (listing + selected*). */
  listing: LinkOptions;
  /** Value pushed into selectedJob / selectedCompany / selectedTalent. */
  selectionKey: string;
};

export function jobDestination(vm: {
  companySlug: string;
  jobSlug: string;
}): MasterDetailDestination {
  return {
    canonical: {
      to: '/companies/$companySlug/jobs/$jobSlug',
      params: { companySlug: vm.companySlug, jobSlug: vm.jobSlug },
    },
    listing: {
      to: '/jobs',
      search: { selectedJob: vm.jobSlug },
    },
    selectionKey: vm.jobSlug,
  };
}

export function companyDestination(input: {
  companySlug: string;
}): MasterDetailDestination {
  return {
    canonical: {
      to: '/companies/$companySlug',
      params: { companySlug: input.companySlug },
    },
    listing: {
      to: '/companies',
      search: { selectedCompany: input.companySlug },
    },
    selectionKey: input.companySlug,
  };
}

export function talentDestination(input: {
  handle: string;
}): MasterDetailDestination {
  return {
    canonical: {
      to: '/p/$handle',
      params: { handle: input.handle },
    },
    listing: {
      to: '/talent',
      search: { selectedTalent: input.handle },
    },
    selectionKey: input.handle,
  };
}
