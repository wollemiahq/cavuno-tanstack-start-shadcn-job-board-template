import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ChevronRight, Plus, Search, XIcon } from 'lucide-react';

import { incomingAuthSearch } from '../lib/board-datalayer-events';
import { boardErrorMessage } from '../lib/board-error-message';
import {
  handleEmployerLoaderErrorUsing,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { refreshSession } from '../server/auth';
import {
  claimCompany,
  createCompany,
  listCompanies,
  searchCompanies,
} from '../server/employers';
import { getSeoBase } from '../server/queries';

import { EmployerIdentityAvatar } from '@/components/account-shell';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import type { UrlSearchInput } from '@/lib/pagination';
import type { CompanyMembership } from '@cavuno/board';

type CompanyStatusLabels = Record<CompanyMembership['status'], () => string>;

export type WorkEmailVerificationOutcome = 'approved' | 'pending' | 'invalid';

export type EmployerDashboardLoaderDependencies = {
  listCompanies: typeof listCompanies;
  getSeoBase: typeof getSeoBase;
  refreshSession: typeof refreshSession;
};

const employerDashboardLoaderDependencies: EmployerDashboardLoaderDependencies =
  {
    listCompanies,
    getSeoBase,
    refreshSession,
  };

export function createEmployerDashboardLoader(
  dependencies: EmployerDashboardLoaderDependencies = employerDashboardLoaderDependencies,
) {
  return async ({
    location,
  }: {
    location: { search?: UrlSearchInput; searchStr?: string };
  }) => {
    try {
      const [companies, seo] = await Promise.all([
        dependencies.listCompanies(),
        dependencies.getSeoBase(),
      ]);
      return { ...companies, seo };
    } catch (error) {
      return await handleEmployerLoaderErrorUsing(
        dependencies.refreshSession,
        error,
        '/employers/dashboard',
        {
          retried: isReauthRetry(location),
          incomingSearch: incomingAuthSearch(location),
        },
      );
    }
  };
}

const STATUS_LABEL = {
  approved: m.employerDashboard_statusApproved,
  pending_work_email: m.employerDashboard_statusPendingWorkEmail,
  awaiting_admin: m.employerDashboard_statusAwaitingAdmin,
  rejected: m.employerDashboard_statusRejected,
} satisfies CompanyStatusLabels;

export type EmployerDashboardViewDependencies = {
  searchCompanies: typeof searchCompanies;
  claimCompany: typeof claimCompany;
  createCompany: typeof createCompany;
  invalidate: () => Promise<void>;
  navigateToOnboarding: (slug: string) => Promise<void>;
  companyRouteElement: (input: {
    approved: boolean;
    slug: string;
  }) => ReactElement;
};

export function EmployerDashboardView({
  companies,
  add,
  verified,
  consumeVerificationOutcome,
  dependencies,
}: {
  companies: CompanyMembership[];
  add?: boolean;
  verified?: WorkEmailVerificationOutcome;
  consumeVerificationOutcome?: () => void;
  dependencies: EmployerDashboardViewDependencies;
}) {
  const [adding, setAdding] = useState(add === true);
  const [verificationOutcome] = useState(verified);

  useEffect(() => {
    if (verified) consumeVerificationOutcome?.();
  }, [consumeVerificationOutcome, verified]);

  if (companies.length === 0 || adding) {
    return (
      <ConnectCompany
        onBack={companies.length > 0 ? () => setAdding(false) : undefined}
        verificationOutcome={verificationOutcome}
        dependencies={dependencies}
      />
    );
  }

  return (
    <YourCompanies
      memberships={companies}
      onAdd={() => setAdding(true)}
      verificationOutcome={verificationOutcome}
      dependencies={dependencies}
    />
  );
}

function YourCompanies({
  memberships,
  onAdd,
  verificationOutcome,
  dependencies,
}: {
  memberships: CompanyMembership[];
  onAdd: () => void;
  verificationOutcome?: WorkEmailVerificationOutcome;
  dependencies: EmployerDashboardViewDependencies;
}) {
  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={m.employerOnboarding_yourCompaniesTitle()}
            description={m.employerOnboarding_yourCompaniesSubtitle()}
            actions={
              <Button size="lg" onClick={onAdd}>
                <Plus data-icon="inline-start" aria-hidden />
                {m.employerOnboarding_addCompanyLabel()}
              </Button>
            }
          />
        }
      >
        <VerificationOutcomeAlert outcome={verificationOutcome} />
        <section
          aria-label={m.employerOnboarding_yourCompaniesTitle()}
          className="grid gap-3"
        >
          {memberships.map((membership) => (
            <CompanyRow
              key={membership.id}
              membership={membership}
              dependencies={dependencies}
            />
          ))}
        </section>
      </PageContent>
    </Page>
  );
}

function CompanyRow({
  membership,
  dependencies,
}: {
  membership: CompanyMembership;
  dependencies: EmployerDashboardViewDependencies;
}) {
  const { company } = membership;
  const approved = membership.status === 'approved';
  const content = (
    <>
      <ItemMedia>
        <EmployerIdentityAvatar name={company.name} logoUrl={company.logoUrl} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{company.name}</ItemTitle>
        {company.website ? (
          <ItemDescription>{company.website}</ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions>
        <Badge variant={approved ? 'default' : 'outline'}>
          {approved ? membership.role : STATUS_LABEL[membership.status]()}
        </Badge>
        <ChevronRight
          className="text-muted-foreground size-4 shrink-0 rtl:rotate-180"
          aria-hidden
        />
      </ItemActions>
    </>
  );

  return company.slug ? (
    <Item
      render={dependencies.companyRouteElement({
        approved,
        slug: company.slug,
      })}
      variant="outline"
      size="sm"
    >
      {content}
    </Item>
  ) : (
    <Item variant="outline" size="sm">
      {content}
    </Item>
  );
}

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
};

type ConnectCompanyState = {
  query: string;
  results: SearchResult[];
  open: boolean;
  message: string;
  modalOpen: boolean;
};

function ConnectCompany({
  onBack,
  verificationOutcome,
  dependencies,
}: {
  onBack?: () => void;
  verificationOutcome?: WorkEmailVerificationOutcome;
  dependencies: EmployerDashboardViewDependencies;
}) {
  const anchorRef = useComboboxAnchor();
  const [state, setState] = useState<ConnectCompanyState>({
    query: '',
    results: [],
    open: false,
    message: '',
    modalOpen: false,
  });
  const searchSeq = useRef(0);
  const { query, results, open, message, modalOpen } = state;
  const updateState = (next: Partial<ConnectCompanyState>) => {
    setState((current) => ({ ...current, ...next }));
  };

  useEffect(() => {
    const q = query.trim();
    // Every query transition invalidates older in-flight requests, including
    // clearing the field while a request is already on the wire.
    const seq = ++searchSeq.current;
    // Search from the very first character — a one-letter pause showing
    // nothing while two letters show results reads as broken.
    if (q.length < 1) {
      setState((current) => ({
        ...current,
        results: [],
        open: false,
        message: '',
      }));
      return;
    }
    const timer = setTimeout(async () => {
      let result: Awaited<ReturnType<typeof dependencies.searchCompanies>>;
      try {
        result = await dependencies.searchCompanies({ data: { q } });
      } catch {
        if (seq !== searchSeq.current) return;
        setState((current) => ({
          ...current,
          results: [],
          message: m.employerCompany_genericError(),
          open: true,
        }));
        return;
      }
      if (seq !== searchSeq.current) return;
      if (result.ok) {
        setState((current) => ({
          ...current,
          results: result.data.data,
          message: '',
          open: true,
        }));
      } else {
        // Surface the error below the field WITHOUT slamming the panel shut
        // mid-typing — the "add as a new company" row stays reachable.
        setState((current) => ({
          ...current,
          results: [],
          message: boardErrorMessage(result),
          open: true,
        }));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [dependencies, query]);

  async function claim(slug: string) {
    updateState({ message: '', open: false });
    let result: Awaited<ReturnType<typeof dependencies.claimCompany>>;
    try {
      result = await dependencies.claimCompany({ data: { slug } });
    } catch {
      updateState({ message: m.employerCompany_genericError() });
      return;
    }
    if (!result.ok) {
      updateState({ message: boardErrorMessage(result) });
      return;
    }
    try {
      await dependencies.invalidate();
      await dependencies.navigateToOnboarding(slug);
    } catch {
      updateState({ message: m.employerCompany_reconciliationError() });
    }
  }

  return (
    <Page width="narrow">
      <PageContent
        header={
          <PageHeader
            align="center"
            title={m.employerOnboarding_connectTitle()}
            description={m.employerOnboarding_connectSubtitle()}
          />
        }
      >
        <VerificationOutcomeAlert outcome={verificationOutcome} />
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
          <Field className="w-full" data-invalid={Boolean(message)}>
            <FieldLabel htmlFor="company-search" className="sr-only">
              {m.employerOnboarding_searchPlaceholder()}
            </FieldLabel>
            <Combobox
              items={results}
              filteredItems={results}
              filter={null}
              autoComplete="none"
              autoHighlight
              open={open && query.trim().length > 0}
              onOpenChange={(nextOpen) =>
                // Never pop an empty-query panel (it would only offer
                // `Add "" as a new company`).
                updateState({ open: nextOpen && query.trim().length > 0 })
              }
              inputValue={query}
              itemToStringLabel={(company: SearchResult) => company.name}
              itemToStringValue={(company: SearchResult) => company.slug}
              isItemEqualToValue={(company, selected) =>
                company.id === selected.id
              }
              onInputValueChange={(nextQuery, details) => {
                if (details.reason !== 'input-change') return;
                // Keep the panel open while typing — it holds the previous
                // results until the debounced search replaces them in place.
                // Closing here (then reopening when results land) is what made
                // the panel flicker on every keystroke. Only an empty query
                // closes it; selection and blur/escape close via onOpenChange.
                updateState({
                  query: nextQuery,
                  open: nextQuery.trim().length > 0,
                  message: '',
                });
              }}
              onValueChange={(company) => {
                if (company) void claim(company.slug);
              }}
            >
              <ComboboxInput
                id="company-search"
                anchorRef={anchorRef}
                type="text"
                value={query}
                showTrigger={false}
                className="h-10 w-full"
                placeholder={m.employerOnboarding_searchPlaceholder()}
                aria-label={m.employerOnboarding_searchPlaceholder()}
                autoFocus
              >
                <InputGroupAddon>
                  <Search aria-hidden />
                </InputGroupAddon>
              </ComboboxInput>
              <ComboboxContent anchor={anchorRef}>
                <ComboboxList>
                  {(company: SearchResult) => (
                    <ComboboxItem
                      key={company.id}
                      value={company}
                      className="min-h-12"
                    >
                      <EmployerIdentityAvatar
                        name={company.name}
                        logoUrl={null}
                        size="default"
                      />
                      <span className="min-w-0">
                        <span className="text-foreground block truncate font-medium">
                          {company.name}
                        </span>
                        {company.website ? (
                          <span className="text-muted-foreground block truncate text-sm">
                            {company.website}
                          </span>
                        ) : null}
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
                {query.trim() ? (
                  <div className="border-border border-t p-1">
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-start px-2 py-2"
                      onClick={() =>
                        updateState({ modalOpen: true, open: false })
                      }
                    >
                      <span className="border-border flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed">
                        <Plus className="size-4" aria-hidden />
                      </span>
                      {m.employerOnboarding_addAsNewCompany({
                        query: query.trim(),
                      })}
                    </Button>
                  </div>
                ) : null}
              </ComboboxContent>
            </Combobox>
          </Field>

          {message ? (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {onBack ? (
            <Button variant="ghost" onClick={onBack}>
              {m.employerOnboarding_backLabel()}
            </Button>
          ) : null}
        </div>

        {modalOpen ? (
          <CreateCompanyModal
            initialName={query.trim()}
            onClose={() => updateState({ modalOpen: false })}
            dependencies={dependencies}
          />
        ) : null}
      </PageContent>
    </Page>
  );
}

function VerificationOutcomeAlert({
  outcome,
}: {
  outcome?: WorkEmailVerificationOutcome;
}) {
  if (!outcome) return null;
  const copy = {
    approved: m.employerDashboard_verifiedApproved,
    pending: m.employerDashboard_verifiedPending,
    invalid: m.employerDashboard_verifiedInvalid,
  }[outcome]();
  return (
    <Alert
      variant={outcome === 'invalid' ? 'destructive' : 'default'}
      className="mx-auto mb-6 max-w-2xl"
    >
      <AlertDescription>{copy}</AlertDescription>
    </Alert>
  );
}

function CreateCompanyModal({
  initialName,
  onClose,
  dependencies,
}: {
  initialName: string;
  onClose: () => void;
  dependencies: EmployerDashboardViewDependencies;
}) {
  const [form, setForm] = useState({ name: initialName, website: '' });
  const [status, setStatus] = useState<
    'idle' | 'saving' | 'error' | 'committed'
  >('idle');
  const [message, setMessage] = useState('');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogClose
          render={
            <Button
              variant="ghost"
              className="bg-secondary absolute end-4 top-4"
              size="icon-sm"
            />
          }
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{m.employerOnboarding_cancelLabel()}</span>
        </DialogClose>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (status === 'saving' || status === 'committed') return;
            setStatus('saving');
            const website = form.website.trim();
            let result: Awaited<ReturnType<typeof dependencies.createCompany>>;
            try {
              const body = website
                ? { name: form.name.trim(), website: `https://${website}` }
                : { name: form.name.trim() };
              result = await dependencies.createCompany({ data: body });
            } catch {
              setStatus('error');
              setMessage(m.employerCompany_genericError());
              return;
            }
            if (!result.ok) {
              setStatus('error');
              setMessage(boardErrorMessage(result));
              return;
            }
            setStatus('committed');
            try {
              await dependencies.invalidate();
              const slug = result.data.company.slug;
              if (slug && result.data.status !== 'approved') {
                await dependencies.navigateToOnboarding(slug);
              } else {
                onClose();
              }
            } catch {
              setMessage(m.employerCompany_reconciliationError());
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.employerOnboarding_modalTitle()}</DialogTitle>
            <DialogDescription>
              {m.employerOnboarding_modalSubtitle()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <Field>
              <FieldLabel htmlFor="company-name">
                {m.employerDashboard_nameLabel()}
              </FieldLabel>
              <Input
                id="company-name"
                value={form.name}
                autoFocus={!initialName}
                onChange={(event) =>
                  setForm({ ...form, name: event.currentTarget.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-website">
                {m.employerDashboard_websiteOptionalLabel()}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>
                    {m.employerDashboard_websiteProtocolPrefix()}
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="company-website"
                  value={form.website}
                  placeholder={m.employerDashboard_websitePlaceholder()}
                  // The name is usually pre-filled from the search query, so
                  // the website is the first thing left to type.
                  autoFocus={Boolean(initialName)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      // Pasted full URLs collapse into the fixed prefix.
                      website: event.currentTarget.value.replace(
                        /^https?:\/\//i,
                        '',
                      ),
                    })
                  }
                />
              </InputGroup>
            </Field>
            {status === 'error' || (status === 'committed' && message) ? (
              <FieldError>{message}</FieldError>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.employerOnboarding_cancelLabel()}
            </Button>
            <Button
              type="submit"
              disabled={status === 'saving' || status === 'committed'}
            >
              {status === 'saving' ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {status === 'saving'
                ? m.employerDashboard_creatingLabel()
                : m.employerDashboard_createCompanyLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
