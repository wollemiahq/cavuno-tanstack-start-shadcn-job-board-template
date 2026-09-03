import { createFileRoute, useRouter } from '@tanstack/react-router';

import { toastActionError } from '../lib/action-toast';
import { getEmployersPage } from '../server/marketing-pages';
import {
  getTalentAccessGrant,
  openTalentBillingPortal,
  startTalentAccessCheckout,
  upgradeTalentAccess,
} from '../server/talent-access';
import { EmployersTalentAccessView } from './-employers.talent-access';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { useRootSession } from '@/components/root-session';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type EmployersSearch = { session_id?: string };

export const Route = createFileRoute('/employers/')({
  validateSearch: (search: UrlSearchInput): EmployersSearch => {
    const out: EmployersSearch = {};
    const sessionId = searchString(search.session_id);
    if (sessionId) out.session_id = sessionId;
    return out;
  },
  loader: () => getEmployersPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  staticData: { ownsMain: true },
  component: EmployersPage,
});

function EmployersPage() {
  const { plans, contactPlans, seo } = Route.useLoaderData();
  const { session_id } = Route.useSearch();
  const router = useRouter();
  const { user, talentAccess, employerCompanies, ready } = useRootSession();
  const approved =
    employerCompanies?.filter(
      (membership) => membership.status === 'approved',
    ) ?? [];
  const companyId =
    talentAccess.companyId ??
    (approved.length === 1 ? approved[0]!.company.id : null);
  const companySlug =
    approved.find((membership) => membership.company.id === companyId)?.company
      .slug ?? (approved.length === 1 ? approved[0]!.company.slug : null);

  const viewer =
    !ready || user === null
      ? ({ kind: 'anonymous' } as const)
      : talentAccess.isEmployer
        ? ({
            kind: 'employer' as const,
            hasTalentAccess: talentAccess.hasTalentAccess,
            companyId,
            companySlug: companySlug ?? null,
          } as const)
        : ({ kind: 'other' } as const);

  return (
    <EmployersTalentAccessView
      plans={plans}
      contactPlans={contactPlans}
      seo={seo}
      sessionId={session_id}
      viewer={viewer}
      getTalentAccessGrantAction={getTalentAccessGrant}
      startCheckoutAction={startTalentAccessCheckout}
      upgradeAction={upgradeTalentAccess}
      openBillingPortalAction={openTalentBillingPortal}
      invalidate={async () => {
        await router.invalidate();
      }}
      reportActionError={toastActionError}
    />
  );
}
