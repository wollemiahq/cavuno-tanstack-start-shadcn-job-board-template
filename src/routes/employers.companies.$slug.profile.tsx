/**
 * Company workspace — Company profile tab (Paper "Employer Sidebar —
 * Profile View / Edit"): view mode renders the profile as candidates see
 * it (header, About prose, open roles, About card rail) with an "Edit
 * profile" button; edit mode swaps the text in place for inputs under an
 * editing banner. Saves through `me.companies.update`.
 *
 * `summary` (the tagline) and the social URLs are write-only on the v1
 * wire — the public read doesn't return them — so edit mode starts them
 * blank (same limitation the previous flat form had).
 */
import { Text } from '@/components/text'
import { useState } from 'react'
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import type { BoardLabelOverrides } from '@cavuno/board/format'

import { toJobCardVM } from '@/board/job-view-model'
import { EmployerCompanyShell } from '@/components/account-shell'
import { JobCard } from '@/components/board/job-card'
import { Prose } from '@/components/prose'
import { getCompanyWorkspace, updateCompany } from '../server/employers'
import { getCompany, listCompanyJobs } from '../server/queries'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Label } from '@/components/base/input/label'
import { TextAreaBase } from '@/components/base/textarea/textarea'
import { m } from '../paraglide/messages'

const rootApi = getRouteApi('__root__')

export const Route = createFileRoute('/employers/companies/$slug/profile')({
  loader: async ({ params }) => {
    try {
      const [workspace, company, publicJobs] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getCompany({ data: { companySlug: params.slug } }),
        listCompanyJobs({ data: { companySlug: params.slug } }),
      ])
      return { workspace, company, publicJobs }
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in', search: { returnTo: undefined } })
    }
  },
  head: () => ({ meta: [{ title: m.employerCompany_metaTitle() }] }),
  component: CompanyProfilePage,
})

function CompanyProfilePage() {
  const { workspace, company, publicJobs } = Route.useLoaderData()
  const { board } = rootApi.useLoaderData()
  const [editing, setEditing] = useState(false)
  const membershipCompany = workspace.membership?.company

  return (
    <EmployerCompanyShell
      slug={workspace.slug}
      company={{
        name: company.name,
        website: company.website,
        logoUrl: company.logoUrl ?? membershipCompany?.logoUrl ?? null,
      }}
      active="profile"
    >
      {editing ? (
        <EditMode
          slug={workspace.slug}
          company={company}
          onExit={() => setEditing(false)}
        />
      ) : (
        <ViewMode
          company={company}
          language={board.language}
          labels={board.labels}
          publicJobs={publicJobs.data}
          onEdit={() => setEditing(true)}
        />
      )}
    </EmployerCompanyShell>
  )
}

type PublicCompany = Awaited<ReturnType<typeof getCompany>>
type PublicCompanyJobs = Awaited<ReturnType<typeof listCompanyJobs>>['data']
type BoardLabels = BoardLabelOverrides | undefined

function AboutCard({
  company,
  editing,
}: {
  company: PublicCompany
  editing?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-secondary p-4">
      <p className="text-tertiary text-xs font-semibold tracking-wide uppercase">
        {m.employerProfile_aboutCardHeading({ company: company.name })}
      </p>
      {editing ?? (
        <dl className="mt-3 space-y-3 text-sm">
          {company.website ? (
            <div>
              <dt className="text-tertiary">
                {m.employerCompany_websiteLabel()}
              </dt>
              <dd>
                <a href={company.website} target="_blank" rel="noreferrer">
                  {company.website}
                </a>
              </dd>
            </div>
          ) : null}
          {company.markets.length > 0 ? (
            <div>
              <dt className="text-tertiary">
                {m.employerProfile_marketsLabel()}
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {company.markets.map((market) => (
                  <span
                    key={market.slug}
                    className="bg-secondary rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {market.name}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  )
}

function ViewMode({
  company,
  language,
  labels,
  publicJobs,
  onEdit,
}: {
  company: PublicCompany
  language: string
  labels: BoardLabels
  publicJobs: PublicCompanyJobs
  onEdit: () => void
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Text as="h1" variant="heading1">{company.name}</Text>
            {company.website ? (
              <p className="text-tertiary mt-1 text-sm">
                {company.website}
              </p>
            ) : null}
          </div>
          <Button color="secondary" size="md" onClick={onEdit}>
            {m.employerProfile_editProfileLabel()}
          </Button>
        </header>

        <section className="space-y-3">
          <Text as="h2" variant="heading4">
            {m.employerProfile_aboutHeading()}
          </Text>
          {company.description ? (
            // Company descriptions arrive pre-sanitized from the Board API;
            // render as HTML so this view matches what candidates see.
            <Prose html={company.description} />
          ) : (
            <p className="text-tertiary text-sm">
              {m.employerCompany_descriptionLabel()} —
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Text as="h2" variant="heading4">
              {m.employerProfile_openRolesHeading()}
            </Text>
            {company.links.public ? (
              <a
                href={company.links.public}
                target="_blank"
                rel="noreferrer"
                className="text-sm"
              >
                {m.employerProfile_viewPublicLabel()}
              </a>
            ) : null}
          </div>
          {publicJobs.length === 0 ? (
            <p className="border-secondary text-tertiary rounded-lg border border-dashed p-8 text-center text-sm">
              {m.employerCompany_noJobsText()}
            </p>
          ) : (
            <div className="space-y-3">
              {publicJobs.slice(0, 5).map((job) => (
                <JobCard
                  key={job.id}
                  vm={toJobCardVM(job, language, labels)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AboutCard company={company} />
    </div>
  )
}

function EditMode({
  slug,
  company,
  onExit,
}: {
  slug: string
  company: PublicCompany
  onExit: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: company.name,
    website: company.website ?? '',
    summary: '',
    description: company.description ?? '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function save() {
    setStatus('saving')
    setMessage('')
    const result = await updateCompany({
      data: {
        slug,
        body: {
          name: form.name.trim(),
          website: form.website.trim(),
          description: form.description.trim(),
          ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
        },
      },
    })
    if (!result.ok) {
      setStatus('error')
      setMessage(result.message)
      return
    }
    await router.invalidate()
    onExit()
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="border-primary/30 bg-secondary/60 text-primary flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm">
        <span>{m.employerProfile_editingBanner()}</span>
        <Button type="button" color="secondary" size="sm" onClick={onExit}>
          {m.employerProfile_exitEditLabel()}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <Input
            label={m.employerCompany_nameLabel()}
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            isRequired
          />
          <Input
            label={m.employerProfile_taglineLabel()}
            value={form.summary}
            onChange={(value) => setForm({ ...form, summary: value })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="profile-description">
              {m.employerCompany_descriptionLabel()}
            </Label>
            <TextAreaBase
              id="profile-description"
              rows={8}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" color="primary" size="md" isDisabled={status === 'saving'}>
              {status === 'saving'
                ? m.employerCompany_savingLabel()
                : m.employerCompany_saveCompanyLabel()}
            </Button>
            {status === 'error' ? (
              <p className="text-error-primary text-sm">{message}</p>
            ) : null}
          </div>
        </div>

        <AboutCard
          company={company}
          editing={
            <div className="mt-3">
              <Input
                label={m.employerCompany_websiteLabel()}
                value={form.website}
                onChange={(value) => setForm({ ...form, website: value })}
              />
            </div>
          }
        />
      </div>
    </form>
  )
}
