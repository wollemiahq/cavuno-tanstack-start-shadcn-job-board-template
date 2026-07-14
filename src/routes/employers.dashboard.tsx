/**
 * Employer dashboard — the Paper onboarding flow (screens 1–9):
 *  - no memberships → "Connect your company" (screens 1–3): centered
 *    typeahead search + "Add … as a new company" → create modal.
 *  - memberships → "Your companies" (screen 9): row per membership with
 *    a role/status badge; pending rows continue at
 *    /employers/onboarding/$slug (screens 4–8).
 */
import { Text } from '@/components/text'
import { useEffect, useRef, useState } from 'react'
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { ChevronRight, Plus, SearchLg } from '@untitledui/icons'
import type { CompanyMembership } from '@cavuno/board'

import { CompanyAvatar } from '@/components/board/company-avatar'
import {
  createCompany,
  claimCompany,
  listCompanies,
  searchCompanies,
} from '../server/employers'
import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { m } from '../paraglide/messages'

export const Route = createFileRoute('/employers/dashboard')({
  loader: async () => {
    try {
      return await listCompanies()
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in', search: { returnTo: undefined } })
    }
  },
  head: () => ({ meta: [{ title: m.employerDashboard_metaTitle() }] }),
  component: EmployerDashboard,
})

const STATUS_LABEL: Record<CompanyMembership['status'], () => string> = {
  approved: m.employerDashboard_statusApproved,
  pending_work_email: m.employerDashboard_statusPendingWorkEmail,
  awaiting_admin: m.employerDashboard_statusAwaitingAdmin,
  rejected: m.employerDashboard_statusRejected,
}

function EmployerDashboard() {
  const companies = Route.useLoaderData()
  const [adding, setAdding] = useState(false)

  if (companies.data.length === 0 || adding) {
    return (
      <ConnectCompany
        onBack={
          companies.data.length > 0 ? () => setAdding(false) : undefined
        }
      />
    )
  }
  return <YourCompanies memberships={companies.data} onAdd={() => setAdding(true)} />
}

// ── Screen 9 — Your companies ────────────────────────────────────────────────

function YourCompanies({
  memberships,
  onAdd,
}: {
  memberships: CompanyMembership[]
  onAdd: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Text as="h1" variant="heading1">
            {m.employerOnboarding_yourCompaniesTitle()}
          </Text>
          <p className="text-tertiary text-sm">
            {m.employerOnboarding_yourCompaniesSubtitle()}
          </p>
        </div>
        <Button color="primary" size="md" iconLeading={Plus} onClick={onAdd}>
          {m.employerOnboarding_addCompanyLabel()}
        </Button>
      </header>

      <div className="divide-y divide-secondary rounded-xl border border-secondary">
        {memberships.map((membership) => (
          <CompanyRow key={membership.id} membership={membership} />
        ))}
      </div>
    </div>
  )
}

function CompanyRow({ membership }: { membership: CompanyMembership }) {
  const company = membership.company
  const slug = company.slug
  const approved = membership.status === 'approved'
  const body = (
    <>
      <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate font-semibold">{company.name}</p>
        {company.website ? (
          <p className="text-tertiary truncate text-sm">{company.website}</p>
        ) : null}
      </div>
      <Badge size="sm" type="pill-color" color={approved ? 'success' : 'gray'}>
        {approved ? membership.role : STATUS_LABEL[membership.status]()}
      </Badge>
      <ChevronRight className="text-tertiary size-4 shrink-0" />
    </>
  )
  if (!slug) {
    return <div className="flex items-center gap-3 p-4">{body}</div>
  }
  return approved ? (
    <Link
      to="/employers/companies/$slug"
      params={{ slug }}
      className="hover:bg-secondary/50 flex items-center gap-3 p-4 hover:no-underline"
    >
      {body}
    </Link>
  ) : (
    <Link
      to="/employers/onboarding/$slug"
      params={{ slug }}
      className="hover:bg-secondary/50 flex items-center gap-3 p-4 hover:no-underline"
    >
      {body}
    </Link>
  )
}

// ── Screens 1–3 — Connect your company ──────────────────────────────────────

type SearchResult = {
  id: string
  name: string
  slug: string
  website: string | null
}

function ConnectCompany({ onBack }: { onBack?: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const searchSeq = useRef(0)

  // Debounced typeahead (Paper screen 2): search fires as you type; stale
  // responses are dropped by sequence number.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    const seq = ++searchSeq.current
    const timer = setTimeout(async () => {
      const result = await searchCompanies({ data: { q } })
      if (seq !== searchSeq.current) return
      if (result.ok) {
        setResults(result.data.data)
        setSearched(true)
      } else {
        setMessage(result.message)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  async function claim(slug: string) {
    setMessage('')
    const result = await claimCompany({ data: { slug } })
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/employers/onboarding/$slug', params: { slug } })
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
      <Text as="h1" variant="heading1">
        {m.employerOnboarding_connectTitle()}
      </Text>
      <p className="text-tertiary mt-2">
        {m.employerOnboarding_connectSubtitle()}
      </p>

      <div className="relative mt-8 w-full max-w-md text-left">
        <Input
          icon={SearchLg}
          value={query}
          onChange={setQuery}
          placeholder={m.employerOnboarding_searchPlaceholder()}
          autoFocus
        />
        {searched ? (
          <div className="bg-primary absolute inset-x-0 top-full z-10 mt-1 divide-y divide-secondary overflow-hidden rounded-lg border border-secondary shadow-sm">
            {results.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => claim(company.slug)}
                className="hover:bg-secondary/50 flex w-full items-center gap-3 p-3 text-left"
              >
                <CompanyAvatar name={company.name} logoUrl={null} size="sm" />
                <span className="min-w-0">
                  <span className="text-primary block truncate font-medium">
                    {company.name}
                  </span>
                  {company.website ? (
                    <span className="text-tertiary block truncate text-sm">
                      {company.website}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hover:bg-secondary/50 text-primary flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="border-secondary flex size-10 shrink-0 items-center justify-center rounded-[9px] border border-dashed">
                <Plus className="size-4" />
              </span>
              {m.employerOnboarding_addAsNewCompany({ query: query.trim() })}
            </button>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-error-primary mt-4 text-sm">{message}</p> : null}
      {onBack ? (
        <Button color="tertiary" size="md" className="mt-8" onClick={onBack}>
          {m.employerOnboarding_backLabel()}
        </Button>
      ) : null}

      {modalOpen ? (
        <CreateCompanyModal
          initialName={query.trim()}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  )
}

// ── Screen 3 — Add a new company modal ───────────────────────────────────────

function CreateCompanyModal({
  initialName,
  onClose,
}: {
  initialName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({ name: initialName, website: '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={m.employerOnboarding_modalTitle()}
        className="bg-primary w-full max-w-md rounded-xl border border-secondary text-left shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setStatus('saving')
            const result = await createCompany({
              data: {
                name: form.name.trim(),
                ...(form.website.trim() ? { website: form.website.trim() } : {}),
              },
            })
            if (!result.ok) {
              setStatus('error')
              setMessage(result.message)
              return
            }
            await router.invalidate()
            const slug = result.data.company.slug
            if (slug && result.data.status !== 'approved') {
              await router.navigate({
                to: '/employers/onboarding/$slug',
                params: { slug },
              })
            } else {
              onClose()
            }
          }}
        >
          <div className="space-y-4 p-6">
            <div>
              <Text as="h2" variant="heading4">
                {m.employerOnboarding_modalTitle()}
              </Text>
              <p className="text-tertiary text-sm">
                {m.employerOnboarding_modalSubtitle()}
              </p>
            </div>
            <Input
              label={m.employerDashboard_nameLabel()}
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              isRequired
            />
            <Input
              label={m.employerDashboard_websiteOptionalLabel()}
              value={form.website}
              placeholder={m.employerDashboard_websitePlaceholder()}
              onChange={(value) => setForm({ ...form, website: value })}
            />
            {status === 'error' ? (
              <p className="text-error-primary text-sm">{message}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-secondary px-6 py-4">
            <Button type="button" color="secondary" size="md" onClick={onClose}>
              {m.employerOnboarding_cancelLabel()}
            </Button>
            <Button type="submit" color="primary" size="md" isDisabled={status === 'saving'}>
              {status === 'saving'
                ? m.employerDashboard_creatingLabel()
                : m.employerDashboard_createCompanyLabel()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
