import { useEffect, useRef, useState } from 'react';

import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronRight, Plus, Search, XIcon } from 'lucide-react';

import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  claimCompany,
  createCompany,
  listCompanies,
  searchCompanies,
} from '../server/employers';

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
import { InputGroupAddon } from '@/components/ui/input-group';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import type { CompanyMembership } from '@cavuno/board';

export const Route = createFileRoute('/employers/dashboard')({
  // `?add` deep-links the connect-a-company view (the candidate account's
  // "For employers" menu targets it directly).
  validateSearch: (search: Record<string, unknown>): { add?: boolean } =>
    search.add === true || search.add === 'true' ? { add: true } : {},
  loader: async () => {
    try {
      return await listCompanies();
    } catch (error) {
      handleEmployerLoaderError(error, '/employers/dashboard');
    }
  },
  head: () => ({ meta: [{ title: m.employerDashboard_metaTitle() }] }),
  staticData: { ownsMain: true },
  component: EmployerDashboard,
});

const STATUS_LABEL: Record<CompanyMembership['status'], () => string> = {
  approved: m.employerDashboard_statusApproved,
  pending_work_email: m.employerDashboard_statusPendingWorkEmail,
  awaiting_admin: m.employerDashboard_statusAwaitingAdmin,
  rejected: m.employerDashboard_statusRejected,
};

function EmployerDashboard() {
  const companies = Route.useLoaderData();
  const { add } = Route.useSearch();
  const [adding, setAdding] = useState(add === true);

  if (companies.data.length === 0 || adding) {
    return (
      <ConnectCompany
        onBack={companies.data.length > 0 ? () => setAdding(false) : undefined}
      />
    );
  }

  return (
    <YourCompanies memberships={companies.data} onAdd={() => setAdding(true)} />
  );
}

function YourCompanies({
  memberships,
  onAdd,
}: {
  memberships: CompanyMembership[];
  onAdd: () => void;
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
        <section
          aria-label={m.employerOnboarding_yourCompaniesTitle()}
          className="grid gap-3"
        >
          {memberships.map((membership) => (
            <CompanyRow key={membership.id} membership={membership} />
          ))}
        </section>
      </PageContent>
    </Page>
  );
}

function CompanyRow({ membership }: { membership: CompanyMembership }) {
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
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      </ItemActions>
    </>
  );

  return company.slug ? (
    <Item
      render={
        <Link
          to={
            approved
              ? '/employers/companies/$slug'
              : '/employers/onboarding/$slug'
          }
          params={{ slug: company.slug }}
        />
      }
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

function ConnectCompany({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
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
    if (q.length < 2) {
      setState((current) => ({
        ...current,
        results: [],
        open: false,
      }));
      return;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const result = await searchCompanies({ data: { q } });
      if (seq !== searchSeq.current) return;
      if (result.ok) {
        setState((current) => ({
          ...current,
          results: result.data.data,
          open: true,
        }));
      } else {
        setState((current) => ({
          ...current,
          message: result.message,
          open: false,
        }));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function claim(slug: string) {
    updateState({ message: '', open: false });
    const result = await claimCompany({ data: { slug } });
    if (!result.ok) {
      updateState({ message: result.message });
      return;
    }
    await router.invalidate();
    await router.navigate({
      to: '/employers/onboarding/$slug',
      params: { slug },
    });
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
              open={open}
              onOpenChange={(nextOpen) => updateState({ open: nextOpen })}
              inputValue={query}
              itemToStringLabel={(company: SearchResult) => company.name}
              itemToStringValue={(company: SearchResult) => company.slug}
              isItemEqualToValue={(company, selected) =>
                company.id === selected.id
              }
              onInputValueChange={(nextQuery, details) => {
                if (details.reason !== 'input-change') return;
                updateState({ query: nextQuery, open: false, message: '' });
              }}
              onValueChange={(company) => {
                if (company) void claim(company.slug);
              }}
            >
              <ComboboxInput
                id="company-search"
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
              <ComboboxContent>
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
          />
        ) : null}
      </PageContent>
    </Page>
  );
}

function CreateCompanyModal({
  initialName,
  onClose,
}: {
  initialName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: initialName, website: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
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
              className="bg-secondary absolute top-4 right-4"
              size="icon-sm"
            />
          }
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{m.employerOnboarding_cancelLabel()}</span>
        </DialogClose>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setStatus('saving');
            const result = await createCompany({
              data: {
                name: form.name.trim(),
                ...(form.website.trim()
                  ? { website: form.website.trim() }
                  : {}),
              },
            });
            if (!result.ok) {
              setStatus('error');
              setMessage(result.message);
              return;
            }
            await router.invalidate();
            const slug = result.data.company.slug;
            if (slug && result.data.status !== 'approved') {
              await router.navigate({
                to: '/employers/onboarding/$slug',
                params: { slug },
              });
            } else {
              onClose();
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
              <Input
                id="company-website"
                value={form.website}
                placeholder={m.employerDashboard_websitePlaceholder()}
                onChange={(event) =>
                  setForm({ ...form, website: event.currentTarget.value })
                }
              />
            </Field>
            {status === 'error' ? <FieldError>{message}</FieldError> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {m.employerOnboarding_cancelLabel()}
            </Button>
            <Button type="submit" disabled={status === 'saving'}>
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
