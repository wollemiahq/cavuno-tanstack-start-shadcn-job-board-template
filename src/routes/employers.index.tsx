import { useEffect, useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';

import { toastActionError } from '../lib/action-toast';
import { getEmployersPage } from '../server/marketing-pages';
import {
  getTalentAccessGrant,
  claimFreeTalentAccess,
  openTalentBillingPortal,
  startTalentAccessCheckout,
  upgradeTalentAccess,
  type TalentAccessGrant,
} from '../server/talent-access';
import {
  EmployersTalentAccessView,
  toEmployersTalentCompanyOptions,
} from './-employers.talent-access';

import { EmployerCompanySelect } from '@/components/board/employer-company-select';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { useRootSession } from '@/components/root-session';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type EmployersSearch = { session_id?: string; companyId?: string };

export const Route = createFileRoute('/employers/')({
  validateSearch: (search: UrlSearchInput): EmployersSearch => {
    const out: EmployersSearch = {};
    const sessionId = searchString(search.session_id);
    if (sessionId) out.session_id = sessionId;
    const companyId = searchString(search.companyId);
    if (companyId) out.companyId = companyId;
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
  const { session_id, companyId: requestedCompanyId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const { user, talentAccess, employerCompanies, ready, refreshSession } =
    useRootSession();
  const companies = toEmployersTalentCompanyOptions(employerCompanies ?? []);
  const company = requestedCompanyId
    ? companies.find((option) => option.id === requestedCompanyId)
    : companies.length === 1
      ? companies[0]
      : undefined;
  const companyId = company?.id;
  const isEmployer = ready && user !== null && talentAccess.isEmployer;
  const [scopedAccess, setScopedAccess] = useState<{
    companyId: string;
    grant: TalentAccessGrant;
  } | null>(null);
  const currentGrant =
    scopedAccess && scopedAccess.companyId === companyId
      ? scopedAccess.grant
      : null;
  const [grantFailedFor, setGrantFailedFor] = useState<string | null>(null);
  const [grantAttempt, setGrantAttempt] = useState(0);

  useEffect(() => {
    if (!isEmployer || !companyId) return;
    let cancelled = false;
    void getTalentAccessGrant({ data: { companyId } }).then(
      (grant) => {
        if (!cancelled) setScopedAccess({ companyId, grant });
      },
      () => {
        if (cancelled) return;
        setGrantFailedFor(companyId);
        toastActionError();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isEmployer, companyId, grantAttempt]);

  const companySelector = (disabled: boolean) =>
    isEmployer &&
    (companies.length > 1 || Boolean(requestedCompanyId && !companyId)) ? (
      <div className="w-full min-w-48 sm:w-auto">
        <EmployerCompanySelect
          id="employer-billing-company"
          companies={companies}
          value={companyId}
          disabled={disabled}
          onChange={(selectedCompanyId) =>
            void navigate({
              search: { companyId: selectedCompanyId },
              resetScroll: false,
            })
          }
        />
      </div>
    ) : undefined;
  const returnPath = companyId
    ? `/employers?${new URLSearchParams({ companyId })}`
    : '/employers';
  const viewer =
    !ready || user === null
      ? ({ kind: 'anonymous' } as const)
      : talentAccess.isEmployer
        ? ({
            kind: 'employer' as const,
            // No approved company: the plan action reports `company_required`.
            // Companies load only for verified users; wait for them first.
            ready:
              ((employerCompanies != null || !user.emailVerified) &&
                companies.length === 0) ||
              Boolean(currentGrant && companyId),
            retryGrant:
              companyId && grantFailedFor === companyId && !currentGrant
                ? () => {
                    setGrantFailedFor(null);
                    setGrantAttempt((attempt) => attempt + 1);
                  }
                : undefined,
            hasTalentAccess: currentGrant?.hasTalentAccess ?? false,
            companyId: companyId ?? null,
            companySlug: company?.slug ?? null,
            companies: company ? [company] : [],
          } as const)
        : ({ kind: 'other' } as const);

  return (
    <EmployersTalentAccessView
      key={companyId ?? 'unselected'}
      companySelector={companySelector}
      returnPath={returnPath}
      plans={plans}
      contactPlans={contactPlans}
      seo={seo}
      sessionId={session_id}
      viewer={viewer}
      getTalentAccessGrantAction={getTalentAccessGrant}
      startCheckoutAction={startTalentAccessCheckout}
      claimAction={claimFreeTalentAccess}
      upgradeAction={upgradeTalentAccess}
      openBillingPortalAction={openTalentBillingPortal}
      invalidate={async () => {
        await Promise.all([router.invalidate(), refreshSession()]);
        if (companyId) {
          const grant = await getTalentAccessGrant({ data: { companyId } });
          setScopedAccess({ companyId, grant });
        }
      }}
      reportActionError={toastActionError}
    />
  );
}
