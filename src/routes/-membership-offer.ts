import { useCallback } from 'react';

import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import type { MembershipsViewer } from '@/components/board/membership-plans';
import type { MembershipOffer } from '@/components/board/membership-post-gate';
import { useRootSession } from '@/components/root-session';
import {
  getMembershipCheckoutState,
  startMembershipCheckout,
} from '@/server/membership-checkout';
import type { Plan } from '@cavuno/board';

/**
 * Who is looking at a membership plan. A membership is bought FOR a company,
 * so a signed-in viewer carries the companies they approved-manage; an
 * approved row without a slug cannot be addressed over the API and is left
 * out.
 */
export function useMembershipsViewer(): MembershipsViewer {
  const { user, ready, employerCompanies } = useRootSession();
  if (!ready || user === null) return { kind: 'anonymous' };
  return {
    kind: 'signed-in',
    companies: (employerCompanies ?? []).flatMap((membership) =>
      membership.status === 'approved' && membership.company.slug
        ? [{ slug: membership.company.slug, name: membership.company.name }]
        : [],
    ),
  };
}

/** The board's memberships, ready to sell from a members-only posting gate. */
export function useMembershipOffer(plans: Plan[]): MembershipOffer {
  const router = useRouter();
  const startCheckoutAction = useServerFn(startMembershipCheckout);
  const getCheckoutStateAction = useServerFn(getMembershipCheckoutState);
  const invalidate = useCallback(() => router.invalidate(), [router]);
  return {
    plans,
    viewer: useMembershipsViewer(),
    startCheckoutAction,
    getCheckoutStateAction,
    invalidate,
  };
}
