import { linkOptions } from '@tanstack/react-router';

/**
 * One listing-family entity's transit: canonical detail (always the href),
 * desktop homepage listing target, and the `selected*` value for in-place select.
 *
 * Built with `linkOptions` so each arm keeps registered-route typing when
 * spread onto `Link` / `navigate` — never a widened `LinkOptions` bag.
 */
export function jobDestination(vm: { companySlug: string; jobSlug: string }) {
  return {
    canonical: linkOptions({
      to: '/companies/$companySlug/jobs/$jobSlug',
      params: { companySlug: vm.companySlug, jobSlug: vm.jobSlug },
    }),
    listing: linkOptions({
      to: '/jobs',
      search: { selectedJob: vm.jobSlug },
    }),
    selectionKey: vm.jobSlug,
  };
}

export function companyDestination(input: { companySlug: string }) {
  return {
    canonical: linkOptions({
      to: '/companies/$companySlug',
      params: { companySlug: input.companySlug },
    }),
    listing: linkOptions({
      to: '/companies',
      search: { selectedCompany: input.companySlug },
    }),
    selectionKey: input.companySlug,
  };
}

export function talentDestination(input: { handle: string }) {
  return {
    canonical: linkOptions({
      to: '/p/$handle',
      params: { handle: input.handle },
    }),
    listing: linkOptions({
      to: '/talent',
      search: { selectedTalent: input.handle },
    }),
    selectionKey: input.handle,
  };
}

export type MasterDetailDestination =
  | ReturnType<typeof jobDestination>
  | ReturnType<typeof companyDestination>
  | ReturnType<typeof talentDestination>;
