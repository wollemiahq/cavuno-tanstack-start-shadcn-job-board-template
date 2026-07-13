import { Text } from '@/components/text'
import { useState } from 'react'
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import type { EmployerApplicant, EmployerPipelineStage } from '@cavuno/board'

import {
  addApplicantNote,
  bulkRejectApplicants,
  createStage,
  getPipeline,
  moveApplicant,
  removeStage,
  renameStage,
} from '../server/employers'
import { Badge } from '@/components/base/badges/badges'
import { Button, styles as buttonStyles } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { cx } from '@/utils/cx'
import { m } from '../paraglide/messages'

export const Route = createFileRoute(
  '/employers/companies/$slug/jobs/$jobId/applicants',
)({
  loader: async ({ params }) => {
    try {
      return await getPipeline({
        data: { slug: params.slug, job: params.jobId },
      })
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.employerApplicants_title() }] }),
  component: ApplicantsPage,
})

function ApplicantsPage() {
  const { slug } = Route.useParams()
  const pipeline = Route.useLoaderData()
  const visibleStages = pipeline.stages.filter((stage) => !stage.hidden)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Text as="h1" variant="heading1">{pipeline.job.title}</Text>
          <p className="text-tertiary text-sm capitalize">
            {pipeline.job.status} ·{' '}
            {pipeline.applicants.length === 1
              ? m.employerApplicants_countOne({
                  count: pipeline.applicants.length,
                })
              : m.employerApplicants_countMany({
                  count: pipeline.applicants.length,
                })}
          </p>
        </div>
        <Link
          to="/employers/companies/$slug"
          params={{ slug }}
          className={cx(
            buttonStyles.common.root,
            buttonStyles.sizes.md.root,
            buttonStyles.colors.secondary.root,
            'hover:no-underline',
          )}
        >
          {m.employerApplicants_backToCompanyLabel()}
        </Link>
      </header>

      <section className="space-y-3">
        <Text as="h2" variant="heading4">{m.employerApplicants_stagesHeading()}</Text>
        <StageManager
          slug={slug}
          jobId={pipeline.job.id}
          stages={pipeline.stages}
        />
      </section>

      <hr className="border-secondary" />

      <section className="space-y-3">
        <Text as="h2" variant="heading4">{m.employerApplicants_title()}</Text>
        {pipeline.applicants.length === 0 ? (
          <p className="border-secondary text-tertiary rounded-lg border border-dashed p-10 text-center">
            {m.employerApplicants_noApplicantsText()}
          </p>
        ) : (
          pipeline.applicants.map((applicant) => (
            <ApplicantRow
              key={applicant.id}
              slug={slug}
              applicant={applicant}
              stages={visibleStages}
            />
          ))
        )}
      </section>
    </div>
  )
}

function StageManager({
  slug,
  jobId,
  stages,
}: {
  slug: string
  jobId: string
  stages: EmployerPipelineStage[]
}) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState('')

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage('')
    const result = await fn()
    if (result.ok) await router.invalidate()
    else setMessage(result.message ?? m.employerApplicants_genericError())
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {stages.map((stage) => (
          <StagePill key={stage.id} slug={slug} stage={stage} onAct={act} />
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!label.trim()) return
          await act(() =>
            createStage({ data: { slug, jobId, label: label.trim() } }),
          )
          setLabel('')
        }}
      >
        <Input
          value={label}
          placeholder={m.employerApplicants_newStagePlaceholder()}
          onChange={setLabel}
        />
        <Button type="submit" color="secondary" size="md">
          {m.employerApplicants_addStageLabel()}
        </Button>
      </form>
      {message ? <p className="text-error-primary text-sm">{message}</p> : null}
    </div>
  )
}

function StagePill({
  slug,
  stage,
  onAct,
}: {
  slug: string
  stage: EmployerPipelineStage
  onAct: (fn: () => Promise<{ ok: boolean; message?: string }>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(stage.label)

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={async (event) => {
          event.preventDefault()
          await onAct(() =>
            renameStage({ data: { slug, stageId: stage.id, label: label.trim() } }),
          )
          setEditing(false)
        }}
      >
        <Input
          size="sm"
          value={label}
          onChange={setLabel}
          className="w-36"
        />
        <Button type="submit" color="primary" size="sm">
          {m.employerApplicants_saveLabel()}
        </Button>
      </form>
    )
  }

  return (
    <span className="border-secondary flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
      {stage.label}
      {stage.isProtected ? (
        <Badge size="sm" type="pill-color" color="gray">
          {m.employerApplicants_systemBadge()}
        </Badge>
      ) : (
        <>
          <button
            type="button"
            className="text-tertiary hover:text-primary"
            onClick={() => setEditing(true)}
          >
            {m.employerApplicants_editLabel()}
          </button>
          <button
            type="button"
            className="text-tertiary hover:text-error-primary"
            onClick={() =>
              onAct(() => removeStage({ data: { slug, stageId: stage.id } }))
            }
          >
            ✕
          </button>
        </>
      )}
    </span>
  )
}

function ApplicantRow({
  slug,
  applicant,
  stages,
}: {
  slug: string
  applicant: EmployerApplicant
  stages: EmployerPipelineStage[]
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const currentStageId =
    stages.find((stage) => (stage.systemStage ?? stage.id) === applicant.stage)
      ?.id ?? ''
  // Timeline entries carry a stage token (a custom stage id or a systemStage
  // key like "applied"); resolve it to the human label, falling back to the
  // raw token for a stage that was since hidden or deleted.
  const stageLabel = (token: string | null) => {
    if (!token) return '—'
    const match = stages.find(
      (stage) => stage.id === token || stage.systemStage === token,
    )
    return match?.label ?? token
  }

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage('')
    const result = await fn()
    if (result.ok) await router.invalidate()
    else setMessage(result.message ?? m.employerApplicants_genericError())
  }

  return (
    <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary_alt">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              {applicant.candidateName ??
                applicant.candidateEmail ??
                m.employerApplicants_applicantFallbackName()}
            </h3>
            {applicant.candidateEmail ? (
              <p className="text-tertiary text-sm">
                {applicant.candidateEmail}
              </p>
            ) : null}
            {applicant.candidateHeadline ? (
              <p className="text-tertiary text-sm">
                {applicant.candidateHeadline}
              </p>
            ) : null}
          </div>
          {applicant.resumeUrl ? (
            <Button
              color="tertiary"
              size="sm"
              href={applicant.resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {m.employerApplicants_resumeLabel()}
            </Button>
          ) : null}
        </div>

        {applicant.coverNote ? (
          <p className="text-sm">{applicant.coverNote}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-tertiary text-sm">
            {m.employerApplicants_stageLabel()}
          </span>
          <Select
            aria-label={m.employerApplicants_stageLabel()}
            size="sm"
            className="w-48"
            selectedKey={currentStageId}
            onSelectionChange={(key) =>
              act(() =>
                moveApplicant({
                  data: {
                    slug,
                    applicationId: applicant.id,
                    stageId: String(key),
                  },
                }),
              )
            }
            items={[
              ...(currentStageId ? [] : [{ id: '', label: applicant.stage }]),
              ...stages.map((stage) => ({ id: stage.id, label: stage.label })),
            ]}
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>
          <Button
            color="tertiary"
            size="sm"
            onClick={() =>
              act(() =>
                bulkRejectApplicants({
                  data: { slug, applicationIds: [applicant.id] },
                }),
              )
            }
          >
            {m.employerApplicants_rejectLabel()}
          </Button>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!note.trim()) return
            await act(() =>
              addApplicantNote({
                data: { slug, applicationId: applicant.id, body: note.trim() },
              }),
            )
            setNote('')
          }}
        >
          <Input
            value={note}
            placeholder={m.employerApplicants_notePlaceholder()}
            onChange={setNote}
          />
          <Button type="submit" color="secondary" size="sm">
            {m.employerApplicants_noteLabel()}
          </Button>
        </form>

        {message ? <p className="text-error-primary text-sm">{message}</p> : null}

        {applicant.timeline.length > 0 ? (
          <ul className="text-tertiary space-y-1 text-xs">
            {applicant.timeline.slice(0, 5).map((entry) => (
              <li key={entry.id}>
                {entry.type === 'note_created' && entry.noteBody
                  ? m.employerApplicants_timelineNote({ note: entry.noteBody })
                  : entry.type === 'stage_changed'
                    ? m.employerApplicants_timelineMoved({
                        from: stageLabel(entry.fromStage),
                        to: stageLabel(entry.toStage),
                      })
                    : entry.type}
                {entry.actorName ? ` · ${entry.actorName}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
